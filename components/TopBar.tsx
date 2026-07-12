'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, Menu, X, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'

type Notification = {
  id: string; title: string; body: string; link?: string; isRead: boolean; createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr  < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export default function TopBar({ userName, onMenuClick }: { userName: string; onMenuClick?: () => void }) {
  const router = useRouter()
  const [showNotifs, setShowNotifs]   = useState(false)
  const [notifications, setNotifs]    = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetch('/api/notifications').then(r => r.json())
      setNotifs(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch { /* non-critical */ }
  }, [])

  // Poll every 30 seconds
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Click-outside to close panel
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const handleClickNotif = async (n: Notification) => {
    if (!n.isRead) {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setShowNotifs(false)
    if (n.link) router.push(n.link)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out successfully')
    router.push('/login')
    router.refresh()
  }

  const initials = userName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div className="topbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
          <span className="topbar-username" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500 }}>System Online</span>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            id="notif-bell-btn"
            onClick={() => { setShowNotifs(v => !v); if (!showNotifs) loadNotifications() }}
            style={{ position: 'relative', background: unreadCount > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${unreadCount > 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: unreadCount > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = unreadCount > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = unreadCount > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '17px', height: '17px', borderRadius: '9px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid rgba(15,23,42,0.9)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotifs && (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '340px', background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 9998, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                  Notifications {unreadCount > 0 && <span style={{ marginLeft: '6px', padding: '1px 7px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>{unreadCount}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 9px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', color: '#818cf8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCheck size={11} /> All read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'rgba(255,255,255,0.2)' }}>
                    <Bell size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                    <div style={{ fontSize: '13px' }}>No notifications yet</div>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id}
                    onClick={() => handleClickNotif(n)}
                    style={{ display: 'flex', gap: '10px', padding: '13px 18px', cursor: n.link ? 'pointer' : 'default', background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? 'transparent' : 'rgba(99,102,241,0.07)' }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.isRead ? 'transparent' : '#6366f1', border: n.isRead ? '1px solid rgba(255,255,255,0.1)' : 'none', marginTop: '4px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: n.isRead ? 500 : 700, color: n.isRead ? 'rgba(255,255,255,0.6)' : 'white', marginBottom: '2px' }}>{n.title}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

        {/* User info */}
        <div className="topbar-username" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{userName}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Logged in</div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  )
}
