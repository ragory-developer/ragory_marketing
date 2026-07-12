import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Campaigns | IN-HOUSE MARKETING',
  description: 'Manage marketing campaigns, track budgets, and monitor campaign performance.',
}

export default function CampaignsPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
