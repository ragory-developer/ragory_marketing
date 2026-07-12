import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reports & Exports | IN-HOUSE MARKETING',
  description: 'Generate advanced reports and export client data to CSV.',
}

export default function ReportsPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
