'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function TopBar({ userName }: { userName: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="topbar">
      <div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Hello, <strong style={{ color: 'white' }}>{userName}</strong></span>
        <button 
          onClick={handleLogout} 
          className="btn-primary" 
          style={{ padding: '8px 16px', width: 'auto', background: 'rgba(255,255,255,0.1)' }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
