'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const SERVICES = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, send, and manage emails on behalf of your team.',
    icon: '✉️',
    color: '#EA4335',
    docsUrl: 'https://console.developers.google.com/apis/api/gmail.googleapis.com',
  },
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Store, manage, and share files in Drive.',
    icon: '💾',
    color: '#4285F4',
    docsUrl: 'https://console.developers.google.com/apis/api/drive.googleapis.com',
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Create and manage spreadsheets dynamically.',
    icon: '📊',
    color: '#0F9D58',
    docsUrl: 'https://console.developers.google.com/apis/api/sheets.googleapis.com',
  },
  {
    id: 'docs',
    name: 'Google Docs',
    description: 'Generate and update documents automatically.',
    icon: '📄',
    color: '#4285F4',
    docsUrl: 'https://console.developers.google.com/apis/api/docs.googleapis.com',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Schedule events and manage team calendars.',
    icon: '📅',
    color: '#1A73E8',
    docsUrl: 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com',
  },
  {
    id: 'forms',
    name: 'Google Forms',
    description: 'Create surveys and collect form responses.',
    icon: '📝',
    color: '#7248B9',
    docsUrl: 'https://console.developers.google.com/apis/api/forms.googleapis.com',
  },
  {
    id: 'meet',
    name: 'Google Meet',
    description: 'Create and schedule video meeting links.',
    icon: '🎥',
    color: '#00832D',
    docsUrl: 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com',
  },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('integrations')
  const [serviceStatus, setServiceStatus] = useState<Record<string, boolean>>({})
  const [hasCredentials, setHasCredentials] = useState(false)
  const [showCredModal, setShowCredModal] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setHasCredentials(data.hasCredentials)
      setServiceStatus(data.services || {})
    } catch {
      toast.error('Failed to load settings')
    }
  }, [])

  useEffect(() => {
    // Handle OAuth callback result
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success) {
      const svc = SERVICES.find(s => s.id === success)
      toast.success(`🎉 ${svc?.name || success} connected successfully!`, { duration: 5000 })
      window.history.replaceState({}, '', '/settings')
    } else if (error) {
      toast.error(`Connection failed: ${error}. Please try again.`)
      window.history.replaceState({}, '', '/settings')
    }

    fetchStatus()
  }, [fetchStatus])

  const handleSaveCredentials = async () => {
    if (!clientId || !clientSecret) {
      toast.error('Both Client ID and Client Secret are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleClientId: clientId, googleClientSecret: clientSecret })
      })
      if (!res.ok) throw new Error()
      toast.success('OAuth credentials saved!')
      setShowCredModal(false)
      setClientId('')
      setClientSecret('')
      fetchStatus()
    } catch {
      toast.error('Failed to save credentials.')
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = async (serviceId: string) => {
    if (!hasCredentials) {
      toast('Please configure your OAuth credentials first.', { icon: '⚠️' })
      setShowCredModal(true)
      return
    }
    toast.loading(`Opening ${SERVICES.find(s => s.id === serviceId)?.name} authorization...`, { id: 'oauth' })
    const res = await fetch(`/api/auth/google/url?service=${serviceId}`)
    const data = await res.json()
    if (data.url) {
      toast.dismiss('oauth')
      window.location.href = data.url
    } else {
      toast.error(data.error || 'Failed to generate URL', { id: 'oauth' })
    }
  }

  const handleDisconnect = async (serviceId: string, serviceName: string) => {
    if (!confirm(`Disconnect ${serviceName}? Employees will lose access to this integration.`)) return
    setDisconnecting(serviceId)
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId })
      })
      if (!res.ok) throw new Error()
      toast.success(`${serviceName} disconnected.`)
      fetchStatus()
    } catch {
      toast.error('Failed to disconnect.')
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'white', margin: 0 }}>Settings</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Manage application configuration and third-party integrations</p>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', marginBottom: '32px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[{ id: 'general', label: '⚙️ General' }, { id: 'integrations', label: '🔌 Integrations' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 20px', background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#6B7280', border: 'none', borderRadius: '7px',
            cursor: 'pointer', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px', color: 'white' }}>General Configuration</h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '28px' }}>Core application settings. Restricted to Super Admin.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#D1D5DB', fontSize: '13px', fontWeight: 500 }}>Application Name</label>
              <input type="text" className="input-field" defaultValue="Marketing Portal" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#D1D5DB', fontSize: '13px', fontWeight: 500 }}>Support Email</label>
              <input type="email" className="input-field" defaultValue="support@company.com" />
            </div>
            <button className="btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }} onClick={() => toast.success('Settings saved')}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div>
          {/* OAuth Credentials Banner */}
          <div style={{
            padding: '16px 24px', borderRadius: '12px', marginBottom: '28px',
            background: hasCredentials ? 'rgba(16,185,129,0.07)' : 'rgba(251,191,36,0.07)',
            border: `1px solid ${hasCredentials ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{hasCredentials ? '✅' : '⚠️'}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: 'white', fontSize: '14px' }}>
                  {hasCredentials ? 'OAuth Credentials Configured' : 'OAuth Credentials Required'}
                </p>
                <p style={{ margin: 0, color: '#9CA3AF', fontSize: '13px' }}>
                  {hasCredentials ? 'Your Google Client ID and Secret are saved. You can now connect individual services below.' : 'Add your Google OAuth Client ID and Secret to start connecting services.'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowCredModal(true)} style={{
              padding: '8px 18px', background: hasCredentials ? 'rgba(255,255,255,0.08)' : 'white',
              color: hasCredentials ? '#D1D5DB' : '#111', border: hasCredentials ? '1px solid rgba(255,255,255,0.1)' : 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap'
            }}>
              {hasCredentials ? '⚙ Update Credentials' : '+ Add Credentials'}
            </button>
          </div>

          {/* Service Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
            {SERVICES.map(service => {
              const isConnected = serviceStatus[service.id] === true
              const isDisconnecting = disconnecting === service.id

              return (
                <div key={service.id} style={{
                  background: isConnected ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px',
                  transition: 'all 0.3s'
                }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '10px', fontSize: '22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${service.color}18`, border: `1px solid ${service.color}30`
                      }}>
                        {service.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'white' }}>{service.name}</h3>
                        <a href={service.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#6B7280', textDecoration: 'none' }}>
                          Enable in Cloud Console ↗
                        </a>
                      </div>
                    </div>
                    {/* Status Pill */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px',
                      background: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${isConnected ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.25)'}`,
                      borderRadius: '20px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? '#10B981' : '#EF4444', boxShadow: `0 0 5px ${isConnected ? '#10B981' : '#EF4444'}` }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isConnected ? '#10B981' : '#EF4444' }}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>{service.description}</p>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {isConnected ? (
                      <>
                        <button onClick={() => handleConnect(service.id)} style={{
                          flex: 1, padding: '9px', background: 'rgba(255,255,255,0.05)',
                          color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
                        }}>
                          🔄 Re-authorize
                        </button>
                        <button onClick={() => handleDisconnect(service.id, service.name)} disabled={isDisconnecting} style={{
                          padding: '9px 16px', background: 'rgba(239,68,68,0.08)',
                          color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                        }}>
                          {isDisconnecting ? '...' : 'Disconnect'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleConnect(service.id)} style={{
                        flex: 1, padding: '9px', background: 'white',
                        color: '#111', border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 48 48">
                          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.4 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.6-5.6C33.9 6.4 29.2 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5 43.5 34.7 43.5 24c0-1.2-.1-2.4-.4-3.5h.5z"/>
                          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.4 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.6-5.6C33.9 6.4 29.2 4.5 24 4.5c-7.7 0-14.4 4.3-17.7 10.2z"/>
                          <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.8-3.6-11.4-8.5L6 31.3C9.3 38.1 16.1 43.5 24 43.5z"/>
                          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.1-2.3 4-4.2 5.3l6.2 5.2c-.4.3 6.2-4.5 6.2-14.5 0-1.2-.1-2.4-.4-3.5h.5z"/>
                        </svg>
                        Connect with Google
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '540px', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'white' }}>Google OAuth Credentials</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>Required once for all Google services</p>
              </div>
              <button onClick={() => setShowCredModal(false)} style={{ background: 'transparent', border: 'none', color: '#6B7280', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: '8px', padding: '14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#93C5FD', fontWeight: 500 }}>📌 Required Redirect URI — add this in Google Cloud Console:</p>
                <code style={{ display: 'block', background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#E5E7EB', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/auth/google/callback
                </code>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#D1D5DB', fontSize: '13px', fontWeight: 500 }}>Client ID <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" className="input-field" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#D1D5DB', fontSize: '13px', fontWeight: 500 }}>Client Secret <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="password" className="input-field" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="GOCSPX-..." />
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <button onClick={() => setShowCredModal(false)} style={{ padding: '10px 18px', background: 'transparent', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>Cancel</button>
              <button onClick={handleSaveCredentials} disabled={saving} style={{ padding: '10px 22px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                {saving ? '⏳ Saving...' : '💾 Save Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
