'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TableProperties, Users, Key, Settings, UserCircle } from 'lucide-react'

export default function SideNav({ role, permissions }: { role: string, permissions: string[] }) {
  const pathname = usePathname()

  const links = [
    { key: 'dashboard',   label: 'Dashboard',    icon: <LayoutDashboard size={18}/>,  href: '/dashboard', always: true },
    { key: 'clients',     label: 'All Clients',  icon: <UserCircle size={18}/>,        href: '/clients' },
    { key: 'sheets',      label: 'Sheets',       icon: <TableProperties size={18}/>,  href: '/sheets' },
    { key: 'employees',   label: 'Employees',    icon: <Users size={18}/>,            href: '/employees', always: role === 'SUPER_ADMIN' },
    { key: 'permissions', label: 'Permissions',  icon: <Key size={18}/>,              href: '/permissions', superAdminOnly: true },
    { key: 'settings',    label: 'Settings',     icon: <Settings size={18}/>,         href: '/settings', superAdminOnly: true },
  ]

  const visibleLinks = links.filter(link => {
    if (link.superAdminOnly) return role === 'SUPER_ADMIN'
    if (role === 'SUPER_ADMIN') return true
    if (link.always) return true
    return permissions.includes(link.key)
  })

  return (
    <div className="sidebar">
      <div style={{ padding: '0 16px 32px 16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>Marketing</h2>
        <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Portal</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visibleLinks.map(link => {
          const isActive = pathname.startsWith(link.href)
          return (
            <Link 
              key={link.key} 
              href={link.href} 
              className={`nav-link ${isActive ? 'active' : ''}`}
              style={{ gap: '12px' }}
            >
              <span style={{ display:'flex', alignItems:'center', flexShrink:0 }}>{link.icon}</span>
              <span style={{ marginLeft:0 }}>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
