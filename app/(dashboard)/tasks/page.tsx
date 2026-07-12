'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, User, X, CheckSquare2, AlertTriangle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#6b7280',
}
const COLUMNS = [
  { status: 'PENDING',     label: 'To Do',       color: '#f59e0b', emoji: '📋' },
  { status: 'IN_PROGRESS', label: 'In Progress',  color: '#0ea5e9', emoji: '⚡' },
  { status: 'COMPLETED',   label: 'Completed',    color: '#10b981', emoji: '✅' },
]

type Task = {
  id: string; title: string; description?: string; status: string; priority: string
  dueDate?: string; completedAt?: string
  assignedTo?: { id: string; name: string }
  createdBy:   { id: string; name: string }
  client?:     { id: string; name: string; shopName?: string }
  campaign?:   { id: string; title: string }
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '' })
  const [saving, setSaving]     = useState(false)
  const [users, setUsers]       = useState<{id:string; name:string}[]>([])
  const [assignTo, setAssignTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/tasks?limit=100').then(r => r.json())
    setTasks(data.tasks || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    fetch('/api/users').then(r => r.json()).then(u => setUsers(u || []))
  }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, assignedToId: assignTo || undefined }),
    })
    if (res.ok) {
      toast.success('Task created'); setShowForm(false)
      setForm({ title:'', description:'', priority:'MEDIUM', dueDate:'' })
      setAssignTo(''); load()
    } else {
      const e = await res.json(); toast.error(e.error || 'Failed')
    }
    setSaving(false)
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (newStatus === 'COMPLETED') toast.success('Task completed! ✅')
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() }
    else toast.error('Failed to delete')
  }

  const byStatus = (status: string) => tasks.filter(t => t.status === status)
  const isOverdue = (t: Task) => t.dueDate && t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Tasks</h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            {tasks.filter(t=>t.status!=='COMPLETED').length} active · {tasks.filter(t=>t.status==='COMPLETED').length} completed
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(79,70,229,0.6)' }}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '400px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.status)
            return (
              <div key={col.status} style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: `1px solid ${col.color}22`, borderRadius: '20px', padding: '18px', minHeight: '200px' }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{col.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '8px', background: `${col.color}22`, color: col.color, fontSize: '12px', fontWeight: 800 }}>{colTasks.length}</span>
                </div>

                {/* Task Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: 'rgba(255,255,255,0.15)' }}>No tasks here</div>
                  )}
                  {colTasks.map(task => {
                    const pc = PRIORITY_COLORS[task.priority]
                    const overdue = isOverdue(task)
                    return (
                      <div key={task.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '14px', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                      >
                        {/* Title + Priority */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', lineHeight: 1.4 }}>{task.title}</div>
                          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, background: `${pc}22`, color: pc, border: `1px solid ${pc}33`, flexShrink: 0 }}>{task.priority}</span>
                        </div>

                        {task.description && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', lineHeight: 1.5 }}>{task.description}</div>
                        )}

                        {/* Meta row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
                          {task.assignedTo && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <User size={10} /> {task.assignedTo.name}
                            </span>
                          )}
                          {task.dueDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: overdue ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                              {overdue && <AlertTriangle size={10} />}
                              <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {task.client && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#818cf8', cursor: 'pointer' }} onClick={() => router.push(`/clients/${task.client!.id}`)}>
                              <ChevronRight size={10} /> {task.client.name}
                            </span>
                          )}
                          {task.campaign && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#7c3aed', cursor: 'pointer' }} onClick={() => router.push(`/campaigns/${task.campaign!.id}`)}>
                              📋 {task.campaign.title}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {col.status === 'PENDING' && (
                            <button onClick={() => moveTask(task.id, 'IN_PROGRESS')} style={{ flex: 1, padding: '5px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '7px', color: '#38bdf8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                              Start →
                            </button>
                          )}
                          {col.status === 'IN_PROGRESS' && (
                            <button onClick={() => moveTask(task.id, 'COMPLETED')} style={{ flex: 1, padding: '5px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '7px', color: '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                              ✓ Complete
                            </button>
                          )}
                          <button onClick={() => deleteTask(task.id)} style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', padding: '30px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>New Task</div>
              <button onClick={() => setShowForm(false)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Title *', field: 'title', placeholder: 'What needs to be done?' },
                { label: 'Description', field: 'description', placeholder: 'Optional details…' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>{label}</label>
                  <input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} className="input-field" style={{ fontSize: '14px' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field" style={{ fontSize: '13px' }}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input-field" style={{ fontSize: '13px' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>Assign To</label>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="input-field" style={{ fontSize: '13px' }}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '11px', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
    </div>
  )
}
