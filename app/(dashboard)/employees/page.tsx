'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function EmployeesPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', username: '', password: '' })

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
    } catch {
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create employee')
        return
      }
      toast.success('Employee created successfully')
      setShowModal(false)
      setNewEmployee({ name: '', username: '', password: '' })
      fetchUsers()
    } catch {
      toast.error('Error creating employee')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })
      fetchUsers()
    } catch {
      toast.error('Error updating status')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Employees</h1>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowModal(true)}>
          + Add Employee
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: user.role === 'SUPER_ADMIN' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                      fontSize: '12px' 
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: user.isActive ? 'var(--success)' : 'var(--danger)' }}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.role !== 'SUPER_ADMIN' && (
                      <button 
                        onClick={() => handleToggleActive(user.id, user.isActive)}
                        className="btn-danger" 
                        style={{ background: user.isActive ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '400px', padding: '32px' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>Create Employee</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="text" placeholder="Full Name" className="input-field" 
                value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required 
              />
              <input 
                type="text" placeholder="Username" className="input-field" 
                value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} required 
              />
              <input 
                type="password" placeholder="Password" className="input-field" 
                value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} required 
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
