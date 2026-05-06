import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SideNav from '@/components/SideNav'
import TopBar from '@/components/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = cookies().get('auth_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload) redirect('/login')

  const { role, permissions, userId } = payload as any

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const user = await prisma.user.findUnique({ where: { id: userId as string } })
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Global Animated Background Blobs */}
      <div className="bg-blob" style={{ top:'5%', left:'5%', width:'400px', height:'400px', background:'#4f46e5' }}></div>
      <div className="bg-blob" style={{ bottom:'5%', right:'5%', width:'500px', height:'500px', background:'#7c3aed', animationDelay:'-5s' }}></div>
      <div className="bg-blob" style={{ top:'30%', left:'40%', width:'350px', height:'350px', background:'#0ea5e9', animationDelay:'-10s' }}></div>

      <SideNav role={role} permissions={permissions || []} />
      <div className="main-content">
        <TopBar userName={user.name} />
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  )
}
