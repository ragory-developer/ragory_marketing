import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { payload, error } = await getAuthPayload()
  if (error) return error

  if (payload.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { pageAccessToken } = await req.json()
    if (!pageAccessToken) {
      return NextResponse.json({ error: 'Page access token is required' }, { status: 400 })
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,picture&access_token=${pageAccessToken}`)
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.error?.message || 'Failed to verify token with Facebook' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      pageId: data.id,
      pageName: data.name,
      picture: data.picture?.data?.url || null
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
