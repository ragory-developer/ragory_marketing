import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | IN-HOUSE MARKETING',
  description: 'Overview of key performance indicators, recent activity, and market insights for the enterprise marketing portal.',
}

export default function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
