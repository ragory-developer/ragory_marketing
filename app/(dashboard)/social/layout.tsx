import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Social Media & Messaging | IN-HOUSE MARKETING',
  description: 'Manage Facebook and LinkedIn posts, and send WhatsApp messages directly from the dashboard.',
}

export default function SocialPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
