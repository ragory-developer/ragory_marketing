'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Phone, MapPin, User, Edit2, Trash2, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, Filter, X, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  PROSPECT:    '#6366f1', CONTACTED: '#0ea5e9', INTERESTED: '#f59e0b',
  NEGOTIATING: '#8b5cf6', CONVERTED:  '#10b981', LOST:       '#ef4444', INACTIVE: '#6b7280',
}
const PRIORITY_COLORS: Record<string, string> = { LOW: '#6b7280', MEDIUM: '#f59e0b', HIGH: '#ef4444' }
const NOTE_TYPE_COLORS: Record<string, string> = {
  GENERAL:'#6366f1', CALL:'#0ea5e9', VISIT:'#10b981', FOLLOW_UP:'#f59e0b', COMPLAINT:'#ef4444', SMS: '#ec4899'
}
const STATUSES = ['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CONVERTED','LOST','INACTIVE']
const PRIORITIES = ['LOW','MEDIUM','HIGH']
const NOTE_TYPES = ['GENERAL','CALL','VISIT','FOLLOW_UP','COMPLAINT', 'SMS']

type Client = {
  id: string; name: string; shopName?: string; phone: string; alternativePhone?: string
  email?: string; address?: string; district?: string; area?: string; businessType?: string
  status: string; priority: string; source?: string; notes?: string
  market?: { id: string, name: string }; marketId?: string
  createdBy: { name: string }; assignedTo?: { name: string }
  lastFollowUpAt?: string; nextFollowUpAt?: string; createdAt: string
  clientNotes: { id: string; content: string; type: string; createdAt: string; author: { name: string } }[]
}

const emptyForm = {
  name:'', phone:'', shopName:'', address:'', alternativePhone:'', email:'',
  businessType:'', district:'', area:'', status:'PROSPECT', priority:'MEDIUM', source:'', notes:'', marketId:'', facebookUrl:''
}

// Move Field outside to prevent re-mounting on parent state changes (fixing focus loss)
const Field = ({ label, name, type='text', options, value, onChange }: any) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
    <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>{label}</label>
    {options ? (
      <select 
        value={value} 
        onChange={e => onChange(name, e.target.value)} 
        className="input-field" 
        style={{ fontSize:'14px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)' }}
      >
        {options.map((o:string) => <option key={o} value={o} style={{ background:'#111827' }}>{o}</option>)}
      </select>
    ) : (
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(name, e.target.value)} 
        className="input-field" 
        autoComplete="off"
        style={{ fontSize:'14px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)' }} 
      />
    )}
  </div>
)

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [q, setQ]             = useState('')
  const [statusF, setStatusF] = useState('')
  const [priorityF, setPriorityF] = useState('')
  const [statusCounts, setStatusCounts] = useState<Record<string,number>>({})
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Client | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [quickNoteId, setQuickNoteId] = useState<string|null>(null)
  const [quickNoteText, setQuickNoteText] = useState('')
  const [quickNoteType, setQuickNoteType] = useState('CALL')
  
  const [markets, setMarkets] = useState<{id:string, name:string}[]>([])
  const [userRole, setUserRole] = useState('')
  const [marketSearch, setMarketSearch] = useState('')
  const [showMarketList, setShowMarketList] = useState(false)
  const [addingMarket, setAddingMarket] = useState(false)
  const [editingMarketId, setEditingMarketId] = useState<string|null>(null)
  const [editingMarketName, setEditingMarketName] = useState('')
  const marketDropdownRef = useRef<HTMLDivElement>(null)

  // SMS State
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [smsClient, setSmsClient] = useState<Client | null>(null)
  const [smsText, setSmsText] = useState('')
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState(0) // 0=primary, 1=alt
  const [smsScheduledTime, setSmsScheduledTime] = useState('')
  const [smsLanguage, setSmsLanguage] = useState<'english' | 'bangla'>('english')
  const [sendingSms, setSendingSms] = useState(false)

  const handleFieldChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', q, ...(statusF && { status: statusF }), ...(priorityF && { priority: priorityF }) })
    const res = await fetch(`/api/clients?${params}`)
    const data = await res.json()
    setClients(data.clients || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    // compute status counts from full response
    if (data.statusCounts) setStatusCounts(data.statusCounts)
    setLoading(false)
  }, [page, q, statusF, priorityF])

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/markets')
      const data = await res.json()
      setMarkets(data || [])
    } catch (err) { console.error('Fetch markets error:', err) }
  }

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUserRole(data.user?.role || '')
    } catch {}
  }

  useEffect(() => { 
    load()
    fetchMarkets()
    fetchMe()

    // Click outside listener for Market dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setShowMarketList(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [load])

  const openAdd = () => { 
    setForm(emptyForm); 
    setEditing(null); 
    setMarketSearch('');
    setShowForm(true) 
  }
  const openEdit = (c: Client) => {
    setForm({ 
      name:c.name, phone:c.phone, shopName:c.shopName||'', address:c.address||'', 
      alternativePhone:c.alternativePhone||'', email:c.email||'', 
      businessType:c.businessType||'', district:c.district||'', area:c.area||'', 
      status:c.status, priority:c.priority, source:c.source||'', notes:c.notes||'',
      marketId: c.marketId || '',
      facebookUrl: c.facebookUrl || ''
    })
    setMarketSearch(c.market?.name || '')
    setEditing(c); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Name & phone required'); return }
    setSaving(true)
    try {
      const method = editing ? 'PATCH' : 'POST'
      const url    = editing ? `/api/clients/${editing.id}` : '/api/clients'
      const res    = await fetch(url, { 
        method, 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(form) 
      })
      if (res.ok) { 
        toast.success(editing ? 'Updated!' : 'Client added!'); 
        setShowForm(false); 
        load() 
      } else { 
        const e = await res.json(); 
        toast.error(e.error || 'Error') 
      }
    } catch (err: any) {
      console.error('Save error:', err)
      toast.error('Database Connection Error. Please check if your DB server is online.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return
    const res = await fetch(`/api/clients/${id}`, { method:'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
    else toast.error('Failed to delete')
  }

  const openView = (c: Client) => {
    router.push(`/clients/${c.id}`)
  }

  const logQuickNote = async (clientId: string, content: string, type: string) => {
    if (!content.trim()) return
    const res = await fetch(`/api/clients/${clientId}/notes`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content, type }) })
    if (res.ok) {
      toast.success(`${type} logged`)
      setQuickNoteId(null); setQuickNoteText('')
      // refresh just this row's note
      const updated = await (await fetch(`/api/clients/${clientId}`)).json()
      setClients(prev => prev.map(cl => cl.id === clientId ? { ...cl, clientNotes: updated.clientNotes?.slice(0,1), lastFollowUpAt: updated.lastFollowUpAt } : cl))
    } else toast.error('Failed to log')
  }

  const openSmsModal = (c: Client) => {
    setSmsClient(c)
    setSelectedPhoneIndex(0)
    setSmsText('')
    setSmsScheduledTime('')
    setSmsLanguage('english')
    setShowSmsModal(true)
  }

  const handleSendSms = async () => {
    if (!smsClient || !smsText.trim()) return
    const targetPhone = selectedPhoneIndex === 0 ? smsClient.phone : smsClient.alternativePhone
    if (!targetPhone) return toast.error('Selected phone number is empty')

    setSendingSms(true)
    try {
      // Format scheduledDateTime to YYYY-MM-DD HH:mm:ss for MRAM API
      let formattedSchedule = ''
      if (smsScheduledTime) {
        const d = new Date(smsScheduledTime)
        const pad = (n: number) => n.toString().padStart(2, '0')
        formattedSchedule = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
      }

      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: smsClient.id, 
          phone: targetPhone, 
          message: smsText,
          scheduledDateTime: formattedSchedule,
          type: smsLanguage === 'bangla' ? 'unicode' : 'text'
        })
      })
      if (res.ok) {
        toast.success('SMS Sent!')
        setShowSmsModal(false)
        load() // Reload to get the latest notes
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to send SMS')
      }
    } catch {
      toast.error('Network error while sending SMS')
    } finally {
      setSendingSms(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'white' }}>All Clients</h1>
          <p style={{ color:'#9ca3af', fontSize:'14px', marginTop:'4px' }}>Survey leads & marketing follow-ups · {total} total</p>
        </div>
        <button onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'#4f46e5', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'14px' }}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Stats Bar - shows real totals from DB */}
      <div className="stats-bar" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:'12px' }}>
        {STATUSES.map(s => {
          const count = statusCounts[s] ?? clients.filter(c=>c.status===s).length
          return (
            <div key={s} onClick={()=>setStatusF(statusF===s?'':s)} style={{ background: statusF===s ? STATUS_COLORS[s]+'33' : 'rgba(15, 23, 42, 0.4)', border: statusF===s ? `1px solid ${STATUS_COLORS[s]}99` : '1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'16px', cursor:'pointer', transition:'all 0.3s ease', boxShadow: statusF===s ? `0 0 20px -5px ${STATUS_COLORS[s]}66` : 'none' }}>
              <div style={{ fontSize:'24px', fontWeight:800, color: statusF===s ? 'white' : STATUS_COLORS[s], transition:'all 0.3s' }}>{count}</div>
              <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:'4px' }}>{s}</div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
          <Search size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
          <input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Search name, phone, shop..." className="input-field" style={{ paddingLeft:'36px', fontSize:'13px', padding:'8px 12px 8px 36px' }} />
        </div>
        <select value={priorityF} onChange={e=>{setPriorityF(e.target.value);setPage(1)}} className="input-field" style={{ width:'130px', fontSize:'13px', padding:'8px 12px' }}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        {(q||statusF||priorityF) && (
          <button onClick={()=>{setQ('');setStatusF('');setPriorityF('');setPage(1)}} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'8px 12px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>
            <X size={14} /> Clear
          </button>
        )}
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'8px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#9ca3af', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="table-container glass-panel">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              {[
                { label: '#', align: 'center' },
                { label: 'Name / Shop' },
                { label: 'Phone' },
                { label: 'Market', tabletHide: true },
                { label: 'Address' },
                { label: 'Status' },
                { label: 'Priority', mobileHide: true },
                { label: 'Activity', mobileHide: true },
                { label: 'Note' },
                { label: 'Rating', tabletHide: true },
                { label: 'Created By', tabletHide: true },
                { label: 'Last Follow', mobileHide: true },
                { label: 'Actions' }
              ].map((h, hi)=>(
                <th key={h.label} className={`${h.tabletHide ? 'hide-tablet' : ''} ${h.mobileHide ? 'hide-mobile' : ''}`} style={{ padding:'16px', fontSize:'10px', color:'#9ca3af', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', textAlign: h.align==='center'?'center':'left', whiteSpace:'nowrap' }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rows */}
            {loading ? (
              <tr><td colSpan={13} style={{ padding:'64px', textAlign:'center', color:'#9ca3af', fontWeight:500 }}>Loading dynamic data...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={13} style={{ padding:'64px', textAlign:'center', color:'#9ca3af', fontWeight:500 }}>No clients found. Start by adding one!</td></tr>
            ) : clients.map((c, i) => {
              const lastNote = c.clientNotes?.[0]
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.2s ease' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.04)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'16px', color:'#6b7280', fontSize:'13px', textAlign:'center', verticalAlign:'top' }}>{(page-1)*20+i+1}</td>
                  <td style={{ padding:'16px', verticalAlign:'top' }}>
                    <div style={{ fontWeight:600, color:'white', fontSize:'14px' }}>{c.name}</div>
                    {c.shopName && <div style={{ color:'#9ca3af', fontSize:'12px', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px' }}><span>🏪</span> {c.shopName}</div>}
                  </td>
                  <td style={{ padding:'16px', verticalAlign:'top' }}>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:500 }}>{c.phone}</div>
                    {c.alternativePhone && <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'2px' }}>{c.alternativePhone}</div>}
                  </td>
                  <td className="hide-tablet" style={{ padding:'16px', verticalAlign:'top' }}>
                    <div style={{ color:'#4f46e5', fontWeight:700, fontSize:'12px' }}>{c.market?.name || '—'}</div>
                  </td>
                  <td style={{ padding:'16px', verticalAlign:'top', color:'#9ca3af', fontSize:'13px', maxWidth:'220px' }}>
                    <div style={{ fontWeight:500, color:'#e2e8f0' }}>{c.district||''}{c.area ? `, ${c.area}` : ''}</div>
                    {c.address && <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px', lineHeight:'1.4', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{c.address}</div>}
                  </td>
                  <td style={{ padding:'16px', verticalAlign:'top' }}>
                    <select 
                      value={c.status} 
                      onChange={async (e) => {
                        const val = e.target.value
                        const res = await fetch(`/api/clients/${c.id}`, { method:'PATCH', body:JSON.stringify({ status: val }) })
                        if (res.ok) {
                          const updated = await res.json()
                          setClients(prev => prev.map(cl => cl.id === c.id ? { ...cl, ...updated } : cl))
                          toast.success(`Status: ${val}`)
                        }
                      }}
                      style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background:STATUS_COLORS[c.status]+'22', color:STATUS_COLORS[c.status], border:`1px solid ${STATUS_COLORS[c.status]}44`, cursor:'pointer', outline:'none' }}
                    >
                      {STATUSES.map(s => <option key={s} value={s} style={{ background:'#111827', color:'white' }}>{s}</option>)}
                    </select>
                  </td>
                  <td className="hide-mobile" style={{ padding:'16px', verticalAlign:'top' }}>
                    <select 
                      value={c.priority} 
                      onChange={async (e) => {
                        const val = e.target.value
                        const res = await fetch(`/api/clients/${c.id}`, { method:'PATCH', body:JSON.stringify({ priority: val }) })
                        if (res.ok) {
                          const updated = await res.json()
                          setClients(prev => prev.map(cl => cl.id === c.id ? { ...cl, ...updated } : cl))
                          toast.success(`Priority: ${val}`)
                        }
                      }}
                      style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:600, background:PRIORITY_COLORS[c.priority]+'22', color:PRIORITY_COLORS[c.priority], border:'none', cursor:'pointer', outline:'none' }}
                    >
                      {PRIORITIES.map(p => <option key={p} value={p} style={{ background:'#111827', color:'white' }}>{p}</option>)}
                    </select>
                  </td>
                  {/* Activity — quick log dropdown */}
                  <td className="hide-mobile" style={{ padding:'16px', verticalAlign:'top' }}>
                    {quickNoteId === c.id ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:'160px' }}>
                        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                          {NOTE_TYPES.map(t => (
                            <button key={t} onClick={()=>setQuickNoteType(t)}
                              style={{ padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:600, border:'1px solid', cursor:'pointer',
                                borderColor: quickNoteType===t ? NOTE_TYPE_COLORS[t] : 'rgba(255,255,255,0.1)',
                                background: quickNoteType===t ? NOTE_TYPE_COLORS[t]+'33' : 'transparent',
                                color: quickNoteType===t ? NOTE_TYPE_COLORS[t] : '#6b7280' }}>{t}</button>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:'4px' }}>
                          <input autoFocus value={quickNoteText} onChange={e=>setQuickNoteText(e.target.value)}
                            onKeyDown={e=>{ if(e.key==='Enter') logQuickNote(c.id, quickNoteText, quickNoteType); if(e.key==='Escape'){setQuickNoteId(null);setQuickNoteText('')} }}
                            placeholder="Add note & press Enter..." style={{ flex:1, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'white', fontSize:'11px', padding:'3px 7px' }} />
                          <button onClick={()=>{setQuickNoteId(null);setQuickNoteText('')}} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'14px', lineHeight:1 }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>{ setQuickNoteId(c.id); setQuickNoteType('CALL'); setQuickNoteText('') }}
                        style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 8px', borderRadius:'4px',
                          background: lastNote ? NOTE_TYPE_COLORS[lastNote.type]+'22' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${lastNote ? NOTE_TYPE_COLORS[lastNote.type]+'44' : 'rgba(255,255,255,0.1)'}`,
                          color: lastNote ? NOTE_TYPE_COLORS[lastNote.type] : '#6b7280', fontSize:'11px', fontWeight:600, cursor:'pointer', textTransform:'uppercase' }}>
                        <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: lastNote ? NOTE_TYPE_COLORS[lastNote.type] : '#6b7280', flexShrink:0 }} />
                        {lastNote ? (lastNote.content.includes('Status changed') ? 'Status ↑' : lastNote.content.includes('Priority changed') ? 'Priority ↑' : lastNote.type) : '+ Log'}
                      </button>
                    )}
                  </td>
                  {/* Note — history count + latest snippet */}
                  <td style={{ padding:'16px', verticalAlign:'top' }}>
                    <button onClick={()=>openView(c)}
                      style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
                      {lastNote ? (
                        <div>
                          <div style={{ fontSize:'12px', color:'#e2e8f0', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {lastNote.content}
                          </div>
                          <div style={{ fontSize:'10px', color:'#6b7280', marginTop:'2px' }}>
                            {new Date(lastNote.createdAt).toLocaleDateString('en', {day:'2-digit',month:'short'})} · {(c.clientNotes?.length||0)} note{c.clientNotes?.length!==1?'s':''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize:'11px', color:'#4b5563' }}>No notes yet</span>
                      )}
                    </button>
                  </td>
                  <td className="hide-tablet" style={{ padding:'16px', verticalAlign:'top' }}>
                    <select 
                      value={(c as any).rating || 0} 
                      onChange={async (e) => {
                        const val = e.target.value
                        const res = await fetch(`/api/clients/${c.id}`, { method:'PATCH', body:JSON.stringify({ rating: val }) })
                        if (res.ok) { 
                          setClients(prev => prev.map(cl => cl.id === c.id ? { ...cl, rating: parseInt(val) } : cl))
                          toast.success('Rating updated')
                        }
                      }}
                      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: (c as any).rating > 7 ? '#10b981' : (c as any).rating > 4 ? '#f59e0b' : '#9ca3af', borderRadius:'6px', padding:'4px 8px', fontSize:'12px', cursor:'pointer', fontWeight:700 }}
                    >
                      {[...Array(11)].map((_, r) => <option key={r} value={r} style={{ background:'#111827' }}>{r === 0 ? 'Rate' : r}</option>)}
                    </select>
                  </td>
                  <td className="hide-tablet" style={{ padding:'16px', verticalAlign:'top', color:'#9ca3af', fontSize:'13px' }}>{c.createdBy?.name}</td>
                  <td className="hide-mobile" style={{ padding:'16px', verticalAlign:'top', color:'#9ca3af', fontSize:'12px', whiteSpace:'nowrap' }}>
                    {c.lastFollowUpAt ? new Date(c.lastFollowUpAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'16px', verticalAlign:'top' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={()=>openSmsModal(c)} title="Send SMS" style={{ padding:'6px', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:'6px', color:'#10b981', cursor:'pointer' }}><MessageCircle size={14}/></button>
                      <button onClick={()=>openView(c)} title="Log Activity / Notes" style={{ padding:'6px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'6px', color:'#818cf8', cursor:'pointer' }}><MessageSquare size={14}/></button>
                      <button onClick={()=>openEdit(c)} title="Edit Details" style={{ padding:'6px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'6px', color:'#fbbf24', cursor:'pointer' }}><Edit2 size={14}/></button>
                      <button onClick={()=>handleDelete(c.id)} title="Delete" style={{ padding:'6px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'6px', color:'#f87171', cursor:'pointer' }}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px' }}>
          <span style={{ color:'#9ca3af', fontSize:'13px' }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
          <div style={{ display:'flex', gap:'8px' }}>
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ padding:'6px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', opacity: page===1?0.4:1 }}><ChevronLeft size={16}/>Prev</button>
            <span style={{ padding:'6px 16px', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', color:'#a5b4fc', borderRadius:'8px', fontSize:'13px' }}>{page} / {pages}</span>
            <button disabled={page===pages} onClick={()=>setPage(p=>p+1)} style={{ padding:'6px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', opacity: page===pages?0.4:1 }}>Next<ChevronRight size={16}/></button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(135deg, rgba(30,27,75,0.75), rgba(17,24,39,0.85))', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(99,102,241,0.25)', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'680px', maxHeight:'90vh', overflowY:'auto' }}>
            {/* Form Content Omitted for brevity, assumed correctly handled by previous multi_replace */}
            <h2 style={{ color:'white', fontSize:'18px', fontWeight:700, marginBottom:'20px' }}>{editing ? 'Edit Client' : 'Add New Client'}</h2>
            <div className="form-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <Field label="Full Name *" name="name" value={form.name} onChange={handleFieldChange} />
              <Field label="Shop Name" name="shopName" value={form.shopName} onChange={handleFieldChange} />
              <Field label="Phone *" name="phone" value={form.phone} onChange={handleFieldChange} />
              <Field label="Alternative Phone" name="alternativePhone" value={form.alternativePhone} onChange={handleFieldChange} />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleFieldChange} />
              <Field label="Business Type" name="businessType" value={form.businessType} onChange={handleFieldChange} />
              <Field label="District" name="district" value={form.district} onChange={handleFieldChange} />
              <Field label="Area" name="area" value={form.area} onChange={handleFieldChange} />
              <Field label="Status" name="status" options={STATUSES} value={form.status} onChange={handleFieldChange} />
              <Field label="Priority" name="priority" options={PRIORITIES} value={form.priority} onChange={handleFieldChange} />
              <Field label="Source" name="source" value={form.source} onChange={handleFieldChange} />
              <Field label="Facebook ID Link" name="facebookUrl" value={form.facebookUrl} onChange={handleFieldChange} />
              
              {/* Market Searchable Dropdown */}
              <div ref={marketDropdownRef} style={{ display:'flex', flexDirection:'column', gap:'6px', position:'relative' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>Market</label>
                <div style={{ position:'relative' }}>
                  <input 
                    placeholder="Search or select market..."
                    value={marketSearch}
                    onChange={(e) => {
                      setMarketSearch(e.target.value)
                      setShowMarketList(true)
                    }}
                    onFocus={() => setShowMarketList(true)}
                    className="input-field"
                    style={{ fontSize:'14px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)' }}
                  />
                  {showMarketList && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', marginTop:'4px', maxHeight:'240px', overflowY:'auto', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.5)', padding:'4px' }}>
                      {markets.filter(m => m.name.toLowerCase().includes(marketSearch.toLowerCase())).map(m => (
                        <div 
                          key={m.id}
                          style={{ padding:'8px 12px', cursor:'pointer', fontSize:'14px', color:'white', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', borderRadius:'6px' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {editingMarketId === m.id ? (
                            <div style={{ display:'flex', gap:'4px', flex:1 }}>
                              <input 
                                autoFocus
                                value={editingMarketName}
                                onChange={e => setEditingMarketName(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ flex:1, background:'rgba(0,0,0,0.4)', border:'1px solid var(--primary)', color:'white', borderRadius:'4px', padding:'2px 6px', fontSize:'13px' }}
                              />
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!editingMarketName.trim()) return
                                  const res = await fetch(`/api/markets/${m.id}`, { method:'PATCH', body: JSON.stringify({ name: editingMarketName }) })
                                  if (res.ok) {
                                    setMarkets(prev => prev.map(mm => mm.id === m.id ? { ...mm, name: editingMarketName } : mm))
                                    setEditingMarketId(null)
                                    toast.success('Market updated')
                                  } else {
                                    const err = await res.json()
                                    toast.error(err.error)
                                  }
                                }}
                                style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'4px', padding:'2px 8px', fontSize:'11px', cursor:'pointer' }}
                              >Save</button>
                            </div>
                          ) : (
                            <>
                              <span style={{ flex:1 }} onClick={() => {
                                handleFieldChange('marketId', m.id)
                                setMarketSearch(m.name)
                                setShowMarketList(false)
                              }}>{m.name}</span>
                              {userRole === 'SUPER_ADMIN' && (
                                <div style={{ display:'flex', gap:'8px', opacity:0.6 }}>
                                  <Edit2 size={12} onClick={(e) => { e.stopPropagation(); setEditingMarketId(m.id); setEditingMarketName(m.name) }} style={{ cursor:'pointer' }} />
                                  <Trash2 size={12} onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    if(!confirm(`Delete market "${m.name}"?`)) return;
                                    const res = await fetch(`/api/markets/${m.id}`, { method:'DELETE' })
                                    if(res.ok) {
                                      setMarkets(prev => prev.filter(mm => mm.id !== m.id))
                                      toast.success('Deleted')
                                    } else {
                                      const err = await res.json()
                                      toast.error(err.error)
                                    }
                                  }} style={{ cursor:'pointer', color:'#ef4444' }} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {marketSearch && !markets.find(m => m.name.toLowerCase() === marketSearch.toLowerCase()) && (
                        <div style={{ padding:'10px 12px', fontSize:'14px' }}>
                          {userRole === 'SUPER_ADMIN' ? (
                            <button 
                              onClick={async () => {
                                setAddingMarket(true)
                                try {
                                  const res = await fetch('/api/markets', { method:'POST', body: JSON.stringify({ name: marketSearch }) })
                                  const newMarket = await res.json()
                                  if (res.ok) {
                                    setMarkets(prev => [...prev, newMarket].sort((a,b) => a.name.localeCompare(b.name)))
                                    handleFieldChange('marketId', newMarket.id)
                                    setShowMarketList(false)
                                    toast.success('Market added!')
                                  } else toast.error(newMarket.error)
                                } catch { toast.error('Failed to add market') }
                                finally { setAddingMarket(false) }
                              }}
                              disabled={addingMarket}
                              style={{ width:'100%', padding:'6px', background:'#4f46e5', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'12px', fontWeight:600 }}
                            >
                              {addingMarket ? 'Adding...' : `Add "${marketSearch}" as New Market`}
                            </button>
                          ) : (
                            <span style={{ color:'#9ca3af', fontSize:'12px', fontStyle:'italic' }}>Market not found (Only SA can add)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'6px' }}>Address</label>
                <textarea value={form.address} onChange={e=>handleFieldChange('address', e.target.value)} rows={2} className="input-field" style={{ fontSize:'14px', padding:'10px 12px', resize:'vertical', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'6px' }}>Internal Notes</label>
                <textarea value={form.notes} onChange={e=>handleFieldChange('notes', e.target.value)} rows={3} className="input-field" style={{ fontSize:'14px', padding:'10px 12px', resize:'vertical', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px' }}>
              <button onClick={()=>setShowForm(false)} style={{ padding:'10px 20px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'8px', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:'#4f46e5', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Client'}</button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSmsModal && smsClient && (
        <div className="modal-overlay" onClick={()=>setShowSmsModal(false)}>
          <div className="sms-modal-inner" onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(135deg, rgba(30,27,75,0.9), rgba(17,24,39,0.95))', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(16,185,129,0.3)', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.6)', borderRadius:'20px', width:'100%', maxWidth:'850px', display:'flex', overflow:'hidden' }}>
            
            {/* Left Side: Client Details */}
            <div className="sms-modal-left" style={{ flex:1, padding:'32px', background:'rgba(0,0,0,0.2)', borderRight:'1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ color:'white', fontSize:'18px', fontWeight:700, marginBottom:'24px', display:'flex', alignItems:'center', gap:'10px' }}>
                <User size={18} color="#10b981" /> Client Profile
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>Full Name</div>
                  <div style={{ fontSize:'16px', color:'white', fontWeight:600 }}>{smsClient.name}</div>
                </div>
                {smsClient.shopName && (
                  <div>
                    <div style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>Shop / Business</div>
                    <div style={{ fontSize:'14px', color:'#e2e8f0' }}>{smsClient.shopName}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', marginBottom:'4px' }}>Phone Numbers</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:'8px' }}>
                    <Phone size={14} color="#a5b4fc" />
                    <span style={{ fontSize:'14px', color:'white' }}>{smsClient.phone}</span>
                    <span style={{ fontSize:'10px', color:'#9ca3af', background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px' }}>Primary</span>
                  </div>
                  {smsClient.alternativePhone && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:'8px', marginTop:'8px' }}>
                      <Phone size={14} color="#a5b4fc" />
                      <span style={{ fontSize:'14px', color:'white' }}>{smsClient.alternativePhone}</span>
                      <span style={{ fontSize:'10px', color:'#9ca3af', background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px' }}>Alternative</span>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', marginBottom:'4px' }}>Location</div>
                  <div style={{ display:'flex', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'12px', borderRadius:'8px' }}>
                    <MapPin size={16} color="#a5b4fc" style={{ flexShrink:0 }} />
                    <div style={{ fontSize:'13px', color:'#e2e8f0', lineHeight:1.4 }}>
                      <span style={{ fontWeight:600, color:'white' }}>{smsClient.district} {smsClient.area ? `— ${smsClient.area}` : ''}</span>
                      {smsClient.address && <div style={{ marginTop:'4px', color:'#9ca3af' }}>{smsClient.address}</div>}
                    </div>
                  </div>
                </div>
                <div>
                   <div style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em' }}>Status & Priority</div>
                   <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                     <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background:STATUS_COLORS[smsClient.status]+'22', color:STATUS_COLORS[smsClient.status], border:`1px solid ${STATUS_COLORS[smsClient.status]}44` }}>{smsClient.status}</span>
                     <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background:PRIORITY_COLORS[smsClient.priority]+'22', color:PRIORITY_COLORS[smsClient.priority], border:`1px solid ${PRIORITY_COLORS[smsClient.priority]}44` }}>{smsClient.priority} Priority</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Side: Messaging Interface */}
            <div style={{ flex:1.2, padding:'32px', display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
                <h2 style={{ color:'white', fontSize:'18px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px' }}>
                  <MessageCircle size={18} color="#10b981" /> Send SMS
                </h2>
                <button onClick={()=>setShowSmsModal(false)} style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer' }}><X size={20} /></button>
              </div>

              {/* Target Number Selection */}
              <div style={{ marginBottom:'20px' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'8px' }}>Send To</label>
                <div style={{ display:'flex', gap:'12px' }}>
                  <label style={{ flex:1, display:'flex', alignItems:'center', gap:'10px', background: selectedPhoneIndex === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${selectedPhoneIndex === 0 ? '#10b981' : 'rgba(255,255,255,0.1)'}`, padding:'12px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s' }}>
                    <input type="radio" name="smsPhone" checked={selectedPhoneIndex === 0} onChange={()=>setSelectedPhoneIndex(0)} style={{ accentColor:'#10b981' }} />
                    <div>
                      <div style={{ color:'white', fontSize:'14px', fontWeight:600 }}>{smsClient.phone}</div>
                      <div style={{ color:'#9ca3af', fontSize:'11px' }}>Primary Number</div>
                    </div>
                  </label>
                  {smsClient.alternativePhone && (
                    <label style={{ flex:1, display:'flex', alignItems:'center', gap:'10px', background: selectedPhoneIndex === 1 ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${selectedPhoneIndex === 1 ? '#10b981' : 'rgba(255,255,255,0.1)'}`, padding:'12px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s' }}>
                      <input type="radio" name="smsPhone" checked={selectedPhoneIndex === 1} onChange={()=>setSelectedPhoneIndex(1)} style={{ accentColor:'#10b981' }} />
                      <div>
                        <div style={{ color:'white', fontSize:'14px', fontWeight:600 }}>{smsClient.alternativePhone}</div>
                        <div style={{ color:'#9ca3af', fontSize:'11px' }}>Alternative Number</div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Schedule Selection */}
              <div style={{ marginBottom:'20px' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'8px' }}>Schedule (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={smsScheduledTime} 
                  onChange={e => setSmsScheduledTime(e.target.value)} 
                  className="input-field" 
                  style={{ width:'100%', fontSize:'14px', padding:'12px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'white', colorScheme: 'dark' }} 
                />
                <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px' }}>Leave empty to send immediately.</div>
              </div>

              {/* Language Selection */}
              <div style={{ marginBottom:'20px' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'8px' }}>Language</label>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button 
                    onClick={() => setSmsLanguage('english')}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', fontSize:'12px', fontWeight:600, border:'1px solid', cursor:'pointer', transition:'all 0.2s',
                      borderColor: smsLanguage === 'english' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      background: smsLanguage === 'english' ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: smsLanguage === 'english' ? '#10b981' : '#9ca3af' }}
                  >English (160 Chars)</button>
                  <button 
                    onClick={() => setSmsLanguage('bangla')}
                    style={{ flex:1, padding:'8px', borderRadius:'8px', fontSize:'12px', fontWeight:600, border:'1px solid', cursor:'pointer', transition:'all 0.2s',
                      borderColor: smsLanguage === 'bangla' ? '#10b981' : 'rgba(255,255,255,0.1)',
                      background: smsLanguage === 'bangla' ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: smsLanguage === 'bangla' ? '#10b981' : '#9ca3af' }}
                  >বাংলা / Bangla (70 Chars)</button>
                </div>
              </div>

              {/* Message Box */}
              <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:'8px' }}>Message Content</label>
                <textarea 
                  value={smsText} 
                  onChange={e=>setSmsText(e.target.value)} 
                  placeholder="Write your SMS message here..." 
                  className="input-field" 
                  style={{ flex:1, minHeight:'120px', fontSize:'14px', padding:'16px', resize:'none', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'12px', color:'white' }} 
                />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'8px' }}>
                  <span style={{ fontSize:'12px', color: smsText.length > (smsLanguage === 'english' ? 160 : 70) ? '#f59e0b' : '#9ca3af' }}>
                    {smsText.length} / {smsLanguage === 'english' ? 160 : 70} chars (approx. {Math.max(1, Math.ceil(smsText.length/(smsLanguage === 'english' ? 160 : 70)))} segment{Math.ceil(smsText.length/(smsLanguage === 'english' ? 160 : 70))>1?'s':''})
                  </span>
                  <button onClick={handleSendSms} disabled={sendingSms || !smsText.trim()} style={{ padding:'12px 24px', background:'#10b981', color:'white', border:'none', borderRadius:'8px', fontWeight:700, cursor: sendingSms||!smsText.trim() ? 'not-allowed' : 'pointer', opacity: sendingSms||!smsText.trim() ? 0.6 : 1, display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 4px 14px 0 rgba(16,185,129,0.39)' }}>
                    {sendingSms ? 'Sending...' : smsScheduledTime ? 'Schedule Message' : 'Send Now'} <MessageCircle size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
