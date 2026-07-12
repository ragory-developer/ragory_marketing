'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, CheckSquare2, Calendar, Edit3, Save, X,
  Plus, Trash2, UserCheck, Clock, AlertTriangle, Target,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:'#6b7280', ACTIVE:'#10b981', PAUSED:'#f59e0b', COMPLETED:'#6366f1', ARCHIVED:'#374151'
}
const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING:'#f59e0b', IN_PROGRESS:'#0ea5e9', COMPLETED:'#10b981', CANCELLED:'#6b7280'
}
const TYPE_COLORS: Record<string, string> = {
  FIELD_SURVEY:'#f59e0b', DIGITAL:'#0ea5e9', EMAIL:'#6366f1',
  SMS:'#ec4899', SOCIAL_MEDIA:'#10b981', FIELD_MARKETING:'#8b5cf6',
}
const CLIENT_STATUS_COLORS: Record<string, string> = {
  PROSPECT:'#6366f1', CONTACTED:'#0ea5e9', INTERESTED:'#f59e0b',
  NEGOTIATING:'#8b5cf6', CLIENTS:'#10b981', LOST:'#ef4444', INACTIVE:'#6b7280',
}

type Campaign = {
  id: string; title: string; type: string; status: string
  description?: string; startDate?: string; endDate?: string
  budget?: number; spent: number; targetCount?: number
  createdBy: { id: string; name: string }
  leads: { id: string; source?: string; addedAt: string; client: { id: string; name: string; shopName?: string; phone: string; status: string; priority: string } }[]
  tasks: {
    id: string; title: string; status: string; priority: string; dueDate?: string; completedAt?: string
    assignedTo?: { id: string; name: string }; createdBy: { id: string; name: string }
    client?: { id: string; name: string }
  }[]
}

type Tab = 'overview' | 'leads' | 'tasks'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('overview')
  const [editing, setEditing]   = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving]     = useState(false)

  // Task creation state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'MEDIUM', dueDate: '', description: '' })
  const [savingTask, setSavingTask] = useState(false)

  const load = async () => {
    setLoading(true)
    const data = await fetch(`/api/campaigns/${id}`).then(r => r.json())
    setCampaign(data)
    setEditForm({
      title: data.title, type: data.type, status: data.status,
      description: data.description || '',
      startDate: data.startDate ? data.startDate.slice(0,10) : '',
      endDate:   data.endDate   ? data.endDate.slice(0,10)   : '',
      budget: data.budget ?? '',
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { toast.success('Campaign updated'); setEditing(false); load() }
    else { const e = await res.json(); toast.error(e.error || 'Update failed') }
    setSaving(false)
  }

  const handleRemoveLead = async (clientId: string) => {
    const res = await fetch(`/api/campaigns/${id}/leads?clientId=${clientId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Lead removed'); load() }
    else toast.error('Failed to remove')
  }

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) { toast.error('Task title required'); return }
    setSavingTask(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskForm, campaignId: id }),
    })
    if (res.ok) { toast.success('Task created'); setShowTaskForm(false); setTaskForm({ title:'', priority:'MEDIUM', dueDate:'', description:'' }); load() }
    else { const e = await res.json(); toast.error(e.error || 'Failed') }
    setSavingTask(false)
  }

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  if (loading) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'rgba(255,255,255,0.3)', fontSize:'14px' }}>Loading campaign…</div>
  }
  if (!campaign) {
    return <div style={{ color:'#f87171', textAlign:'center', padding:'60px' }}>Campaign not found.</div>
  }

  const statusColor = STATUS_COLORS[campaign.status] ?? '#6b7280'
  const typeColor   = TYPE_COLORS[campaign.type]   ?? '#6b7280'
  const pct = campaign.budget ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100)) : 0

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'leads',    label: 'Leads',  count: campaign.leads.length },
    { key: 'tasks',    label: 'Tasks',  count: campaign.tasks.length },
  ]

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Back Button */}
      <button onClick={() => router.push('/campaigns')} style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'20px', padding:'8px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
        <ArrowLeft size={14} /> All Campaigns
      </button>

      {/* Campaign Header Card */}
      <div style={{ background:'rgba(15,23,42,0.85)', backdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'24px', padding:'28px', marginBottom:'20px', boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <input value={editForm.title} onChange={e => setEditForm((f:any) => ({...f, title:e.target.value}))} className="input-field" placeholder="Campaign title" style={{ fontSize:'18px', fontWeight:700 }} />
            <input value={editForm.description} onChange={e => setEditForm((f:any) => ({...f, description:e.target.value}))} className="input-field" placeholder="Description" style={{ fontSize:'14px' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
              {[
                { label:'Status', field:'status', options:['DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED'] },
                { label:'Type',   field:'type',   options:['FIELD_SURVEY','DIGITAL','EMAIL','SMS','SOCIAL_MEDIA','FIELD_MARKETING'] },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>{label}</label>
                  <select value={editForm[field]} onChange={e => setEditForm((f:any) => ({...f, [field]:e.target.value}))} className="input-field" style={{ fontSize:'13px' }}>
                    {options.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>Budget (৳)</label>
                <input type="number" value={editForm.budget} onChange={e => setEditForm((f:any) => ({...f, budget:e.target.value}))} className="input-field" style={{ fontSize:'13px' }} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              {['startDate','endDate'].map(f => (
                <div key={f}>
                  <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>{f==='startDate'?'Start':'End'} Date</label>
                  <input type="date" value={editForm[f]} onChange={e => setEditForm((ff:any) => ({...ff, [f]:e.target.value}))} className="input-field" style={{ fontSize:'13px' }} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
              <button onClick={() => setEditing(false)} style={{ padding:'10px 20px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontWeight:600, fontSize:'13px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'10px', color:'white', cursor:'pointer', fontWeight:700, fontSize:'13px', opacity:saving?0.7:1 }}>
                <Save size={14} style={{ display:'inline', marginRight:'6px', verticalAlign:'middle' }} />{saving?'Saving…':'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'16px' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px', flexWrap:'wrap' }}>
                  <span style={{ padding:'3px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:800, background:`${statusColor}22`, color:statusColor, border:`1px solid ${statusColor}44` }}>{campaign.status}</span>
                  <span style={{ padding:'3px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700, background:`${typeColor}18`, color:typeColor, border:`1px solid ${typeColor}33` }}>{campaign.type.replace(/_/g,' ')}</span>
                </div>
                <h1 style={{ fontSize:'24px', fontWeight:800, color:'white', marginBottom:'6px' }}>{campaign.title}</h1>
                {campaign.description && <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>{campaign.description}</p>}
              </div>
              <button onClick={() => setEditing(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'white', cursor:'pointer', fontWeight:600, fontSize:'13px', flexShrink:0 }}>
                <Edit3 size={14} /> Edit
              </button>
            </div>

            {/* Quick stats */}
            <div style={{ display:'flex', gap:'24px', flexWrap:'wrap', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon:<Users size={14}/>,        color:'#6366f1', label:'Leads',    val:campaign.leads.length },
                { icon:<CheckSquare2 size={14}/>,  color:'#10b981', label:'Tasks',    val:campaign.tasks.length },
                { icon:<Target size={14}/>,        color:'#f59e0b', label:'Target',   val:campaign.targetCount ?? '—' },
                { icon:<Calendar size={14}/>,      color:'#0ea5e9', label:'Start',    val:campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—' },
                { icon:<Calendar size={14}/>,      color:'#8b5cf6', label:'End',      val:campaign.endDate   ? new Date(campaign.endDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})   : '—' },
              ].map(({ icon, color, label, val }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px' }}>
                  <span style={{ color }}>{icon}</span>
                  <span style={{ color:'rgba(255,255,255,0.3)' }}>{label}:</span>
                  <span style={{ color:'white', fontWeight:700 }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Budget bar */}
            {campaign.budget && (
              <div style={{ marginTop:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }}>
                  <span>Budget Utilisation</span>
                  <span style={{ color: pct>80?'#ef4444':'rgba(255,255,255,0.7)', fontWeight:700 }}>৳{campaign.spent.toLocaleString()} / ৳{campaign.budget.toLocaleString()} ({pct}%)</span>
                </div>
                <div style={{ height:'6px', borderRadius:'6px', background:'rgba(255,255,255,0.08)' }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:'6px', background:pct>80?'linear-gradient(90deg,#f59e0b,#ef4444)':'linear-gradient(90deg,#4f46e5,#10b981)', transition:'width 0.8s ease' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'4px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px', transition:'all 0.2s',
              background: tab===t.key ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
              color: tab===t.key ? 'white' : 'rgba(255,255,255,0.4)',
              boxShadow: tab===t.key ? '0 4px 16px -4px rgba(79,70,229,0.5)' : 'none',
            }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {/* Task status breakdown */}
          <div style={{ background:'rgba(15,23,42,0.8)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'24px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'16px' }}>Task Status</div>
            {(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'] as const).map(s => {
              const count = campaign.tasks.filter(t => t.status === s).length
              const color = TASK_STATUS_COLORS[s]
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:color }} />
                    <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>{s.replace('_',' ')}</span>
                  </div>
                  <span style={{ fontSize:'16px', fontWeight:700, color:'white' }}>{count}</span>
                </div>
              )
            })}
          </div>
          {/* Client pipeline */}
          <div style={{ background:'rgba(15,23,42,0.8)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'24px' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'16px' }}>Lead Pipeline</div>
            {['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CLIENTS'].map(s => {
              const count = campaign.leads.filter(l => l.client.status === s).length
              const color = CLIENT_STATUS_COLORS[s]
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:color }} />
                    <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>{s}</span>
                  </div>
                  <span style={{ fontSize:'16px', fontWeight:700, color:'white' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div style={{ background:'rgba(15,23,42,0.8)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'24px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'16px' }}>
            {campaign.leads.length} Leads in Campaign
          </div>
          {campaign.leads.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>No leads added yet. Assign clients from the Clients page.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {campaign.leads.map(l => {
                const sc = CLIENT_STATUS_COLORS[l.client.status] ?? '#6b7280'
                return (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'white', flexShrink:0 }}>
                      {l.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'white' }}>{l.client.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)' }}>{l.client.phone}{l.client.shopName ? ` · ${l.client.shopName}` : ''}</div>
                    </div>
                    <span style={{ padding:'2px 8px', borderRadius:'6px', fontSize:'10px', fontWeight:700, background:`${sc}22`, color:sc, border:`1px solid ${sc}33`, flexShrink:0 }}>{l.client.status}</span>
                    {l.source && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', flexShrink:0 }}>{l.source}</span>}
                    <button onClick={() => handleRemoveLead(l.client.id)} style={{ padding:'5px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
            <button onClick={() => setShowTaskForm(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'10px', color:'white', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
              <Plus size={14} /> Add Task
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px' }}>
            {(['PENDING','IN_PROGRESS','COMPLETED'] as const).map(colStatus => (
              <div key={colStatus} style={{ background:'rgba(15,23,42,0.7)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'16px' }}>
                <div style={{ fontSize:'11px', fontWeight:800, color:TASK_STATUS_COLORS[colStatus], textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:TASK_STATUS_COLORS[colStatus], display:'inline-block' }} />
                  {colStatus.replace('_',' ')} ({campaign.tasks.filter(t=>t.status===colStatus).length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {campaign.tasks.filter(t => t.status === colStatus).map(task => {
                    const pc = task.priority==='HIGH'?'#ef4444':task.priority==='MEDIUM'?'#f59e0b':'#6b7280'
                    return (
                      <div key={task.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'12px' }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'white', marginBottom:'6px' }}>{task.title}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px', flexWrap:'wrap' }}>
                          <span style={{ padding:'2px 7px', borderRadius:'5px', fontSize:'10px', fontWeight:700, background:`${pc}22`, color:pc, border:`1px solid ${pc}33` }}>{task.priority}</span>
                          {task.assignedTo && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)' }}>@{task.assignedTo.name}</span>}
                          {task.dueDate && <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', gap:'3px' }}><Clock size={9}/>{new Date(task.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}
                        </div>
                        {colStatus === 'PENDING' && (
                          <button onClick={() => handleUpdateTaskStatus(task.id,'IN_PROGRESS')} style={{ marginTop:'8px', width:'100%', padding:'5px', background:'rgba(14,165,233,0.1)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:'7px', color:'#38bdf8', fontSize:'11px', fontWeight:600, cursor:'pointer' }}>
                            Mark In Progress →
                          </button>
                        )}
                        {colStatus === 'IN_PROGRESS' && (
                          <button onClick={() => handleUpdateTaskStatus(task.id,'COMPLETED')} style={{ marginTop:'8px', width:'100%', padding:'5px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'7px', color:'#34d399', fontSize:'11px', fontWeight:600, cursor:'pointer' }}>
                            ✓ Complete
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {campaign.tasks.filter(t => t.status === colStatus).length === 0 && (
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.15)', textAlign:'center', padding:'16px 0' }}>No tasks here</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Task creation modal */}
          {showTaskForm && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'24px' }}>
              <div style={{ background:'rgba(15,23,42,0.98)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'440px', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:'white', marginBottom:'20px' }}>New Task</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  <div>
                    <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>Title *</label>
                    <input value={taskForm.title} onChange={e => setTaskForm(f=>({...f,title:e.target.value}))} className="input-field" placeholder="e.g. Survey north Dhaka district" style={{ fontSize:'14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>Description</label>
                    <input value={taskForm.description} onChange={e => setTaskForm(f=>({...f,description:e.target.value}))} className="input-field" placeholder="Optional details" style={{ fontSize:'14px' }} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <div>
                      <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>Priority</label>
                      <select value={taskForm.priority} onChange={e => setTaskForm(f=>({...f,priority:e.target.value}))} className="input-field" style={{ fontSize:'13px' }}>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', fontWeight:700, display:'block', marginBottom:'5px' }}>Due Date</label>
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f=>({...f,dueDate:e.target.value}))} className="input-field" style={{ fontSize:'13px' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
                  <button onClick={() => setShowTaskForm(false)} style={{ flex:1, padding:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'rgba(255,255,255,0.6)', fontWeight:600, cursor:'pointer', fontSize:'13px' }}>Cancel</button>
                  <button onClick={handleCreateTask} disabled={savingTask} style={{ flex:2, padding:'10px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'10px', color:'white', fontWeight:700, cursor:'pointer', fontSize:'13px', opacity:savingTask?0.7:1 }}>
                    {savingTask?'Creating…':'Create Task'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
