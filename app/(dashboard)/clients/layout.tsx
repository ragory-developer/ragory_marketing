import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clients | IN-HOUSE MARKETING',
  description: 'Manage prospects, leads, and clients with advanced filtering and activity tracking.',
}

export default function ClientsPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
