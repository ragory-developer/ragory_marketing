'use client'

import { useState } from 'react'
import SideNav from '@/components/SideNav'
import TopBar from '@/components/TopBar'

export default function DashboardClient({ 
  user, 
  role, 
  permissions, 
  children 
}: { 
  user: any, 
  role: string, 
  permissions: string[], 
  children: React.ReactNode 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      <SideNav 
        role={role} 
        permissions={permissions} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />
      
      <div className="main-content">
        <TopBar 
          userName={user.name} 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        <div className="content-area">
          {children}
        </div>
      </div>
    </>
  )
}
