'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SheetsPage() {
  const [sheets, setSheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')

  useEffect(() => {
    fetchSheets()
  }, [])

  const fetchSheets = async () => {
    try {
      const res = await fetch('/api/sheets')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSheets(data)
    } catch {
      toast.error('Failed to load spreadsheets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSheet = async () => {
    if (!newSheetName) return
    setCreating(true)
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSheetName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Spreadsheet created!')
      setShowCreate(false)
      setNewSheetName('')
      fetchSheets()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sheet')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSheet = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Remove this sheet from the portal?')) return
    try {
      const res = await fetch(`/api/sheets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Sheet removed')
      fetchSheets()
    } catch {
      toast.error('Failed to remove sheet')
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
            <span style={{ fontSize: '32px' }}>📊</span> Sheets
          </h1>
          <p style={{ color: '#9CA3AF', marginTop: '4px' }}>Professional internal spreadsheet management</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreate(true)}
          style={{ width: 'auto', background: '#0F9D58', fontWeight: 600, padding: '12px 24px' }}
        >
          + Create New Sheet
        </button>
      </div>

      <div>
        {loading ? (
          <div style={{ color: '#9CA3AF', textAlign: 'center', padding: '40px' }}>Loading spreadsheets...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {sheets.length === 0 && (
              <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📂</span>
                <p>No spreadsheets found. Create your first one to get started!</p>
              </div>
            )}
            {sheets.map(sheet => (
              <Link 
                key={sheet.id}
                href={`/sheets/${sheet.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  style={{ 
                    padding: '24px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.border = '1px solid rgba(15,157,88,0.5)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#0F9D5820', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
                    <button 
                      onClick={(e) => handleDeleteSheet(e, sheet.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
                    >
                      🗑️
                    </button>
                  </div>

                  <h4 style={{ color: 'white', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{sheet.name}</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>Created By:</span>
                      <span style={{ color: '#D1D5DB' }}>{sheet.creator?.name || 'Unknown'}</span>
                    </div>
                    {sheet.updater && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#6B7280' }}>Last Edit:</span>
                        <span style={{ color: '#D1D5DB' }}>{sheet.updater.name}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>Date:</span>
                      <span style={{ color: '#D1D5DB' }}>{new Date(sheet.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '450px', padding: '32px', background: '#111827' }}>
            <h2 style={{ marginBottom: '8px', fontSize: '20px', color: 'white', fontWeight: 600 }}>New Sheet</h2>
            <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '24px' }}>
              Create a new sheet within the portal database.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#D1D5DB', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Sheet Title</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Marketing Leads 2024" 
                value={newSheetName}
                onChange={e => setNewSheetName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '0 16px' }}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleCreateSheet} 
                disabled={creating || !newSheetName} 
                style={{ width: 'auto', background: '#0F9D58', padding: '10px 24px' }}
              >
                {creating ? 'Creating...' : 'Create Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
