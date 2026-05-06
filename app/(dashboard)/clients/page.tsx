'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Phone, MapPin, User, Edit2, Trash2, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  PROSPECT:    '#6366f1', CONTACTED: '#0ea5e9', INTERESTED: '#f59e0b',
  NEGOTIATING: '#8b5cf6', CONVERTED:  '#10b981', LOST:       '#ef4444', INACTIVE: '#6b7280',
}
const PRIORITY_COLORS: Record<string, string> = { LOW: '#6b7280', MEDIUM: '#f59e0b', HIGH: '#ef4444' }
const NOTE_TYPE_COLORS: Record<string, string> = {
  GENERAL:'#6366f1', CALL:'#0ea5e9', VISIT:'#10b981', FOLLOW_UP:'#f59e0b', COMPLAINT:'#ef4444'
}
const STATUSES = ['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CONVERTED','LOST','INACTIVE']
const PRIORITIES = ['LOW','MEDIUM','HIGH']
const NOTE_TYPES = ['GENERAL','CALL','VISIT','FOLLOW_UP','COMPLAINT']

type Client = {
  id: string; name: string; shopName?: string; phone: string; alternativePhone?: string
  email?: string; address?: string; district?: string; area?: string; businessType?: string
  status: string; priority: string; source?: string; notes?: string
  createdBy: { name: string }; assignedTo?: { name: string }
  lastFollowUpAt?: string; nextFollowUpAt?: string; createdAt: string
  clientNotes: { id: string; content: string; type: string; createdAt: string; author: { name: string } }[]
}

const emptyForm = {
  name:'', phone:'', shopName:'', address:'', alternativePhone:'', email:'',
  businessType:'', district:'', area:'', status:'PROSPECT', priority:'MEDIUM', source:'', notes:''
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

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true) }
  const openEdit = (c: Client) => {
    setForm({ name:c.name, phone:c.phone, shopName:c.shopName||'', address:c.address||'', alternativePhone:c.alternativePhone||'', email:c.email||'', businessType:c.businessType||'', district:c.district||'', area:c.area||'', status:c.status, priority:c.priority, source:c.source||'', notes:c.notes||'' })
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:'12px' }}>
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
      <div className="table-container glass-panel" style={{ overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'1300px' }}>
          <thead>
            <tr style={{ background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              {['#','Name / Shop','Phone','Address','Status','Priority','Activity','Note','Rating','Created By','Last Follow','Actions'].map(h=>(
                <th key={h} style={{ padding:'16px', fontSize:'10px', color:'#9ca3af', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rows */}
            {loading ? (
              <tr><td colSpan={12} style={{ padding:'64px', textAlign:'center', color:'#9ca3af', fontWeight:500 }}>Loading dynamic data...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={12} style={{ padding:'64px', textAlign:'center', color:'#9ca3af', fontWeight:500 }}>No clients found. Start by adding one!</td></tr>
            ) : clients.map((c, i) => {
              const lastNote = c.clientNotes?.[0]
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.2s ease' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.04)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'12px 16px', color:'#6b7280', fontSize:'13px' }}>{(page-1)*20+i+1}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:600, color:'white', fontSize:'14px' }}>{c.name}</div>
                    {c.shopName && <div style={{ color:'#9ca3af', fontSize:'12px', marginTop:'2px' }}>🏪 {c.shopName}</div>}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ color:'#e2e8f0', fontSize:'13px' }}>{c.phone}</div>
                    {c.alternativePhone && <div style={{ color:'#6b7280', fontSize:'12px' }}>{c.alternativePhone}</div>}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#9ca3af', fontSize:'13px', maxWidth:'180px' }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.district||''}{c.area ? `, ${c.area}` : ''}</div>
                    {c.address && <div style={{ fontSize:'11px', color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.address}</div>}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
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
                  <td style={{ padding:'12px 16px' }}>
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
                  <td style={{ padding:'8px 16px' }}>
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
                  <td style={{ padding:'8px 16px' }}>
                    <button onClick={()=>openView(c)}
                      style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
                      {lastNote ? (
                        <div>
                          <div style={{ fontSize:'12px', color:'#e2e8f0', maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
                  <td style={{ padding:'12px 16px' }}>
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
                  <td style={{ padding:'12px 16px', color:'#9ca3af', fontSize:'13px' }}>{c.createdBy?.name}</td>
                  <td style={{ padding:'12px 16px', color:'#9ca3af', fontSize:'12px', whiteSpace:'nowrap' }}>
                    {c.lastFollowUpAt ? new Date(c.lastFollowUpAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
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
            <h2 style={{ color:'white', fontSize:'18px', fontWeight:700, marginBottom:'20px' }}>{editing ? 'Edit Client' : 'Add New Client'}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
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
              <div></div>
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
    </div>
  )
}
