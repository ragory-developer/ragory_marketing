'use client'
import { useRouter } from 'next/navigation'
import { LogOut, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out successfully')
    router.push('/login')
    router.refresh()
  }

  const initials = userName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div className="topbar">
      {/* Left: breadcrumb placeholder / page title slot */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80' }} />
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'13px', fontWeight:500 }}>System Online</span>
      </div>

      {/* Right: user + actions */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>

        {/* Notification bell */}
        <button style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'8px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.5)', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.5)' }}>
          <Bell size={16} />
        </button>

        {/* Divider */}
        <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.08)' }} />

        {/* User info */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, color:'white', flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ lineHeight:1.3 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'white' }}>{userName}</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>Logged in</div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.2)' }}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  )
}
