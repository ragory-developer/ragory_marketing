'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, X, Users, Calendar, TrendingUp, Megaphone, CheckSquare2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLORS: Record<string, string> = {
  FIELD_SURVEY:     '#f59e0b',
  DIGITAL:          '#0ea5e9',
  EMAIL:            '#6366f1',
  SMS:              '#ec4899',
  SOCIAL_MEDIA:     '#10b981',
  FIELD_MARKETING:  '#8b5cf6',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     '#6b7280',
  ACTIVE:    '#10b981',
  PAUSED:    '#f59e0b',
  COMPLETED: '#6366f1',
  ARCHIVED:  '#374151',
}

const TYPES    = ['FIELD_SURVEY','DIGITAL','EMAIL','SMS','SOCIAL_MEDIA','FIELD_MARKETING']
const STATUSES = ['DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED']

type Campaign = {
  id: string; title: string; type: string; status: string
  description?: string; startDate?: string; endDate?: string
  budget?: number; spent: number; targetCount?: number
  createdBy: { name: string }; createdAt: string
  _count: { leads: number; tasks: number }
}

const emptyForm = {
  title: '', type: 'FIELD_MARKETING', description: '',
  startDate: '', endDate: '', budget: '', targetCount: '',
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [q, setQ]                 = useState('')
  const [statusF, setStatusF]     = useState('')
  const [typeF, setTypeF]         = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ limit: '30' })
    if (statusF) p.set('status', statusF)
    if (typeF)   p.set('type', typeF)
    const data = await fetch(`/api/campaigns?${p}`).then(r => r.json())
    // client-side filter by title search
    const all: Campaign[] = data.campaigns || []
    const filtered = q ? all.filter(c => c.title.toLowerCase().includes(q.toLowerCase())) : all
    setCampaigns(filtered)
    setTotal(data.total || 0)
    setLoading(false)
  }, [statusF, typeF, q])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        type:  form.type,
        description:  form.description || undefined,
        startDate:    form.startDate   || undefined,
        endDate:      form.endDate     || undefined,
        budget:       form.budget      ? parseFloat(form.budget)      : undefined,
        targetCount:  form.targetCount ? parseInt(form.targetCount)   : undefined,
      }),
    })
    if (res.ok) {
      const camp = await res.json()
      toast.success('Campaign created!')
      setShowForm(false)
      setForm(emptyForm)
      router.push(`/campaigns/${camp.id}`)
    } else {
      const e = await res.json()
      toast.error(e.error || 'Failed to create campaign')
    }
    setSaving(false)
  }

  const getBudgetPct = (c: Campaign) => {
    if (!c.budget || c.budget === 0) return 0
    return Math.min(100, Math.round((c.spent / c.budget) * 100))
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Campaigns</h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{total} total campaigns</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(79,70,229,0.6)' }}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search campaigns…" className="input-field" style={{ paddingLeft: '36px', fontSize: '13px' }} />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="input-field" style={{ width: '140px', fontSize: '13px' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} className="input-field" style={{ width: '160px', fontSize: '13px' }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        {(statusF || typeF || q) && (
          <button onClick={() => { setStatusF(''); setTypeF(''); setQ('') }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '16px' }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height: '200px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'rgba(255,255,255,0.2)' }}>
          <Megaphone size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          <div style={{ fontSize: '16px', fontWeight: 600 }}>No campaigns found</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>Create your first campaign to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '16px' }}>
          {campaigns.map(c => {
            const pct = getBudgetPct(c)
            const typeColor = TYPE_COLORS[c.type] ?? '#6b7280'
            const statusColor = STATUS_COLORS[c.status] ?? '#6b7280'
            return (
              <div key={c.id}
                onClick={() => router.push(`/campaigns/${c.id}`)}
                style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '22px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${typeColor}33` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '6px', lineHeight: 1.3 }}>{c.title}</div>
                    {c.description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ padding: '3px 9px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`, letterSpacing: '0.04em' }}>{c.status}</span>
                    <span style={{ padding: '3px 9px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}33` }}>{c.type.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                    <Users size={12} color="#6366f1" />
                    <span><strong style={{ color: 'white' }}>{c._count.leads}</strong> leads</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                    <CheckSquare2 size={12} color="#10b981" />
                    <span><strong style={{ color: 'white' }}>{c._count.tasks}</strong> tasks</span>
                  </div>
                  {c.startDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                      <Calendar size={12} color="#f59e0b" />
                      <span>{new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Budget bar */}
                {c.budget && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                      <span>Budget</span>
                      <span style={{ color: pct > 80 ? '#ef4444' : 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                        ৳{c.spent.toLocaleString()} / ৳{c.budget.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: pct > 80 ? '#ef4444' : '#4f46e5', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  Created by {c.createdBy.name} · {new Date(c.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,27,75,0.98))', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>New Campaign</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Set up a new marketing campaign</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {([
                { label: 'Campaign Title *', field: 'title', placeholder: 'e.g. Q3 Field Survey Dhaka' },
                { label: 'Description', field: 'description', placeholder: 'Brief overview of this campaign' },
              ] as const).map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>{label}</label>
                  <input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} className="input-field" style={{ fontSize: '14px' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Campaign Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field" style={{ fontSize: '14px' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field" style={{ fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-field" style={{ fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Budget (৳)</label>
                  <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" className="input-field" style={{ fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Lead Target</label>
                  <input type="number" value={form.targetCount} onChange={e => setForm(f => ({ ...f, targetCount: e.target.value }))} placeholder="0" className="input-field" style={{ fontSize: '14px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4}50%{opacity:0.7} }`}</style>
    </div>
  )
}
