# Production Setup Guide: Facebook Page & Social CRM Integration

This guide walks you through the step-by-step process of transitioning the portal's social integration from mock endpoints to live production APIs, specifically detailing how to connect a **Facebook Business Page** to capture incoming comments/messages as CRM Leads and publish posts.

---

## 💡 Bypassing Meta Business Verification (Development Mode)
You **do not** need a verified Meta Business Account or App Review to connect your real Facebook page and start testing. By keeping your Meta App in **Development Mode**, you can build, test, and use the real integration immediately.

### How it works:
- All APIs and Webhooks are active and fully functional.
- Only users registered as **Roles** (Admins, Developers, or Testers) on your Meta Developer App can interact with the Page and trigger the CRM.
- This is perfect for internal testing, staging, and demo environments without waiting for verification.

### How to add Testers:
1. Go to the [Meta Developer Portal](https://developers.facebook.com/).
2. Select your App.
3. In the left sidebar, click **App Roles** -> **Roles**.
4. Scroll to the **Testers** section and click **Add Testers**.
5. Enter the Facebook Username or ID of your team members.
6. Instruct them to go to [developers.facebook.com/requests](https://developers.facebook.com/requests) and accept the invite. They can now send real messages to your Facebook Page, which will be captured as live leads in your CRM.

---

## 📋 Pre-requisites Checklist
- [ ] A Facebook Page where you have Administrator access.
- [ ] SSL configured on your web server (Meta only connects to HTTPS endpoints).
- [ ] Your portal deployed to a public URL (or local tunneling using `ngrok` for localhost testing).

---

## 1. Meta Developer App Configuration

1. Go to the [Meta Developer Portal](https://developers.facebook.com/) and register.
2. Click **Create App** and select **Other** -> **Business** (this app type has access to Pages and WhatsApp).
3. Under **App Settings -> Basic**, copy your **App ID** and **App Secret**.
4. Scroll to the bottom of the page, click **Add Platform**, select **Website**, and enter your portal's URL (e.g., `https://your-marketing-portal.com` or your `ngrok` URL).

---

## 2. Setting Up Facebook Page Permissions & Tokens

To post to your Page and receive messages automatically, you must generate a **Never-Expiring Page Access Token**.

### Step 2.1: Authorize Permissions via Graph API Explorer
1. Navigate to the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your newly created App in the dropdown.
3. Under **Permissions**, add the following:
   - `pages_show_list` (Allows finding your Page)
   - `pages_read_engagement` (Allows reading posts and stats)
   - `pages_manage_posts` (Allows publishing posts to the Page feed)
   - `pages_messaging` (Allows reading and replying to Messenger chats)
4. Click **Generate Access Token** and log in with your Facebook account that manages the Page.

### Step 2.2: Convert to a Never-Expiring Page Token
By default, the token generated is a **Short-Lived Token** (expires in 2 hours). Follow these steps to get a permanent token:

1. **Get a Long-Lived User Access Token:**
   Make an HTTP GET request (you can use your browser or Postman):
   ```http
   GET https://graph.facebook.com/v21.0/oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={APP_ID}&
     client_secret={APP_SECRET}&
     fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
   *Copy the `access_token` from the JSON response. This token is valid for 60 days.*

2. **Get the Page ID & Page Access Token:**
   Use the 60-day token to query the accounts endpoint:
   ```http
   GET https://graph.facebook.com/v21.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}
   ```
   Find your target Page in the response array and copy:
   - **`id`** (Your Facebook Page ID)
   - **`access_token`** (This Page token **never expires** unless you change your password).

3. Save these credentials in your `.env` file:
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   FACEBOOK_PAGE_ID=your_facebook_page_id
   FACEBOOK_PAGE_ACCESS_TOKEN=your_permanent_page_token
   ```

---

## 3. Real-Time Lead Capturing via Webhooks

Webhooks allow Facebook to notify your portal instantly when a customer comments on a post or sends a message, so you can display it in your **CRM Threaded Inbox**.

### Step 3.1: Verify Webhook Setup (GET Endpoint)
Meta requires you to deploy a validation endpoint. Create a new file at `app/api/social/webhooks/facebook/route.ts` with the following validation logic:

```typescript
import { NextRequest, NextResponse } from 'next/server'

// GET handler for Meta validation challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // You define this verify token in the Meta Developer settings
  const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'my_crm_verify_token'

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook validated successfully!')
    return new Response(challenge, { status: 200 })
  }
  
  return new Response('Verification failed', { status: 403 })
}
```

### Step 3.2: Capture Inbound Messages (POST Endpoint)
Add a POST handler in the same file to process messages and automatically add them to the local `SocialMessage` database:

```typescript
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Ensure it is a page event
    if (body.object === 'page') {
      for (const entry of body.entry) {
        // Handle incoming Messenger chats
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            const senderId = messagingEvent.sender.id // Facebook scoped user ID
            const messageText = messagingEvent.message.text

            if (messageText) {
              // 1. Fetch sender profile details from Meta Graph API
              const profileRes = await fetch(
                `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`
              )
              const profile = await profileRes.json()
              const senderName = `${profile.first_name || 'Facebook'} ${profile.last_name || 'User'}`

              // 2. Check if a CRM Client is already linked
              const linkedClient = await prisma.client.findFirst({
                where: { source: 'FACEBOOK', phone: senderId }
              })

              // 3. Save to SocialMessage database
              await prisma.socialMessage.create({
                data: {
                  platform: 'FACEBOOK',
                  direction: 'INBOUND',
                  senderName: senderName,
                  to: senderId, // Store PSID so we can message back
                  content: messageText,
                  status: 'RECEIVED',
                  clientId: linkedClient?.id || null,
                  isLeadCaptured: !!linkedClient
                }
              })
            }
          }
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 })
    }
    return new Response('Not Found', { status: 404 })
  } catch (err) {
    console.error('Facebook Webhook Error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

### Step 3.3: Configure Webhook in Meta Console
1. In your Meta App Dashboard, click **Add Product** and select **Webhooks**.
2. Select **Page** from the dropdown menu and click **Configure this Webhook**.
3. **Callback URL:** `https://your-marketing-portal.com/api/social/webhooks/facebook` (or your active `ngrok` HTTPS tunnel url).
4. **Verify Token:** `my_crm_verify_token` (matches the `FACEBOOK_WEBHOOK_VERIFY_TOKEN` env variable).
5. Under Page subscription fields, subscribe to **`messages`** and **`feed`** (for posts/comments).

---

## 4. Activating Live Outbound APIs

To send outbound replies and publish posts from the portal, edit your core routes to trigger real network requests to Meta:

### 4.1 Outbound Messenger Replies
When you type a reply in the Threaded Inbox, trigger the Send API:
```typescript
// Replace mock reply code inside app/api/social/inbox/route.ts
const response = await fetch(
  `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientPsid }, // Selected PSID (e.g. senderId)
      message: { text: replyText }
    })
  }
)
```

### 4.2 Publishing Posts to Facebook Page Feed
To publish text and image updates:
```typescript
// Replace mock composer inside app/api/social/posts/route.ts
const response = await fetch(
  `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/feed?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: postContent,
      link: postImage || undefined // Attaches visual links
    })
  }
)
```

---

## 5. Moving to Production (Meta App Review)
When you are ready to open the integration to the **public** (users who are not registered testers):
1. Complete **Meta Business Verification** in Business Settings.
2. Go to **App Review -> Request Permissions**.
3. Submit a request for:
   - `pages_messaging`
   - `pages_manage_posts`
4. Once approved, toggle the app switch to **Live Mode**.
