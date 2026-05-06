'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TableProperties, Users, Key,
  Settings, UserCircle, ShieldCheck, Building2
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard',   icon: <LayoutDashboard size={18}/>, href: '/dashboard', always: true },
      { key: 'clients',   label: 'All Clients', icon: <UserCircle size={18}/>,      href: '/clients' },
      { key: 'sheets',    label: 'Sheets',      icon: <TableProperties size={18}/>, href: '/sheets' },
    ]
  },
  {
    label: 'Team',
    items: [
      { key: 'employees',   label: 'Employees',   icon: <Users size={18}/>,      href: '/employees',   adminOnly: true },
      { key: 'permissions', label: 'Permissions', icon: <ShieldCheck size={18}/>, href: '/permissions', superAdminOnly: true },
    ]
  },
  {
    label: 'System',
    items: [
      { key: 'settings', label: 'Settings', icon: <Settings size={18}/>, href: '/settings', superAdminOnly: true },
    ]
  }
]

export default function SideNav({ role, permissions }: { role: string, permissions: string[] }) {
  const pathname = usePathname()

  const isVisible = (item: any) => {
    if (item.superAdminOnly) return role === 'SUPER_ADMIN'
    if (item.adminOnly) return role === 'SUPER_ADMIN' || role === 'ADMIN'
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
    if (item.always) return true
    return permissions.includes(item.key)
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div style={{ padding:'0 8px 32px 8px', display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Building2 size={20} color="white" />
        </div>
        <div>
          <div style={{ fontSize:'16px', fontWeight:800, color:'white', lineHeight:1.2 }}>Marketing</div>
          <div style={{ color:'#818cf8', fontSize:'10px', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' }}>Portal</div>
        </div>
      </div>

      {/* Nav Groups */}
      <nav style={{ display:'flex', flexDirection:'column', gap:'24px', flex:1 }}>
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(isVisible)
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.1em', paddingLeft:'12px', marginBottom:'6px' }}>
                {group.label}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                {visibleItems.map(link => {
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                  return (
                    <Link
                      key={link.key}
                      href={link.href}
                      style={{
                        display:'flex', alignItems:'center', gap:'10px',
                        padding:'10px 12px', borderRadius:'10px', textDecoration:'none',
                        transition:'all 0.2s ease', position:'relative',
                        background: isActive ? 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(124,58,237,0.25))' : 'transparent',
                        border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                        color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                        boxShadow: isActive ? '0 4px 20px -4px rgba(79,70,229,0.4)' : 'none',
                        fontWeight: isActive ? 700 : 500, fontSize:'14px',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                          e.currentTarget.style.color = 'white'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                          e.currentTarget.style.borderColor = 'transparent'
                        }
                      }}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div style={{ position:'absolute', left:0, top:'20%', height:'60%', width:'3px', borderRadius:'0 3px 3px 0', background:'linear-gradient(to bottom, #818cf8, #4f46e5)' }} />
                      )}
                      <span style={{ display:'flex', alignItems:'center', flexShrink:0, color: isActive ? '#a5b4fc' : 'inherit' }}>
                        {link.icon}
                      </span>
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Bottom role badge */}
      <div style={{ marginTop:'auto', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 12px', borderRadius:'10px', background:'rgba(0,0,0,0.2)' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', flexShrink:0 }}>
            {role === 'SUPER_ADMIN' ? 'SA' : role === 'ADMIN' ? 'AD' : 'US'}
          </div>
          <div>
            <div style={{ fontSize:'11px', color:'#e2e8f0', fontWeight:600 }}>{role.replace('_',' ')}</div>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)' }}>Access Level</div>
          </div>
        </div>
      </div>
    </div>
  )
}
