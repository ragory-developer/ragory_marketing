import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tasks | IN-HOUSE MARKETING',
  description: 'Manage tasks and field operations on a Kanban board.',
}

export default function TasksPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
