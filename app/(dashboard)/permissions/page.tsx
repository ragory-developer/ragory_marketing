'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sheets', label: 'Google Workspace Hub' },
  { key: 'employees', label: 'Employees' }
]

export default function PermissionsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetchPermissions(selectedUserId)
    } else {
      setUserPermissions([])
    }
  }, [selectedUserId])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      // Only show employees, super admin has access to everything anyway
      setUsers(data.filter((u: any) => u.role !== 'SUPER_ADMIN'))
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async (userId: string) => {
    try {
      const res = await fetch(`/api/permissions/${userId}`)
      const data = await res.json()
      setUserPermissions(data)
    } catch {
      toast.error('Failed to load permissions')
    }
  }

  const handleToggle = (key: string) => {
    if (userPermissions.includes(key)) {
      setUserPermissions(userPermissions.filter(p => p !== key))
    } else {
      setUserPermissions([...userPermissions, key])
    }
  }

  const handleSave = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      await fetch(`/api/permissions/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: userPermissions })
      })
      toast.success('Permissions saved')
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Manage Permissions</h1>

      <div style={{ display: 'flex', gap: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px', width: '300px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Select Employee</h3>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    background: selectedUserId === user.id ? 'var(--primary)' : 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {user.name} ({user.username})
                </button>
              ))}
              {users.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No employees found.</p>}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Access Rights</h3>
          {!selectedUserId ? (
            <p style={{ color: 'var(--text-muted)' }}>Select an employee to manage permissions.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={userPermissions.includes(perm.key)}
                      onChange={() => handleToggle(perm.key)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '16px' }}>{perm.label} Module</span>
                  </label>
                ))}
              </div>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
