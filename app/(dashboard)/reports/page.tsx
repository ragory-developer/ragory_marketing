'use client'
import { useState } from 'react'
import { FileText, Users, TrendingUp, Download, Filter, X, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES  = ['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CLIENTS','LOST','INACTIVE']
const DISTRICTS = ['Dhaka','Chittagong','Rajshahi','Khulna','Sylhet','Barisal','Rangpur','Mymensingh']

export default function ReportsPage() {
  const [status, setStatus]   = useState('')
  const [priority, setPriority] = useState('')
  const [district, setDistrict] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    const p = new URLSearchParams()
    if (status)   p.set('status', status)
    if (priority) p.set('priority', priority)
    if (district) p.set('district', district)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo)   p.set('dateTo', dateTo)

    try {
      const res = await fetch(`/api/reports/clients/export?${p}`)
      if (!res.ok) { toast.error('Export failed'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `clients_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded!')
    } catch {
      toast.error('Network error')
    }
    setExporting(false)
  }

  const clearFilters = () => {
    setStatus(''); setPriority(''); setDistrict(''); setDateFrom(''); setDateTo('')
  }
  const hasFilters = status || priority || district || dateFrom || dateTo

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>Reports & Export</h1>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Generate filtered reports and download data for offline analysis</div>
      </div>

      {/* Client Export Card */}
      <div style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', marginBottom: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>Client Export</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Export filtered client data to CSV</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '14px', marginBottom: '20px' }}>
          {/* Status */}
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field" style={{ fontSize: '13px' }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field" style={{ fontSize: '13px' }}>
              <option value="">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          {/* District */}
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>District</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} className="input-field" style={{ fontSize: '13px' }}>
              <option value="">All Districts</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Date From */}
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              <Calendar size={10} style={{ display:'inline', marginRight:'4px' }} />
              Date From
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" style={{ fontSize: '13px' }} />
          </div>
          {/* Date To */}
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              <Calendar size={10} style={{ display:'inline', marginRight:'4px' }} />
              Date To
            </label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" style={{ fontSize: '13px' }} />
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px', padding: '12px', background: 'rgba(99,102,241,0.06)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginRight: '4px' }}>Active filters:</span>
            {status   && <span style={{ padding:'3px 10px', background:'rgba(99,102,241,0.2)', color:'#a5b4fc', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{status}</span>}
            {priority && <span style={{ padding:'3px 10px', background:'rgba(245,158,11,0.2)', color:'#fbbf24', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{priority}</span>}
            {district && <span style={{ padding:'3px 10px', background:'rgba(16,185,129,0.2)', color:'#34d399', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{district}</span>}
            {dateFrom && <span style={{ padding:'3px 10px', background:'rgba(14,165,233,0.2)', color:'#38bdf8', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>From {dateFrom}</span>}
            {dateTo   && <span style={{ padding:'3px 10px', background:'rgba(14,165,233,0.2)', color:'#38bdf8', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>To {dateTo}</span>}
            <button onClick={clearFilters} style={{ padding:'3px 8px', background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'20px', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
              <X size={10} /> Clear
            </button>
          </div>
        )}

        {/* Export button */}
        <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '14px', color: 'white', fontWeight: 700, fontSize: '15px', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1, boxShadow: '0 4px 20px -4px rgba(79,70,229,0.6)', transition: 'all 0.2s' }}>
          <Download size={18} />
          {exporting ? 'Preparing CSV…' : 'Download Clients CSV'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '10px' }}>
          File includes: name, shop, phone, email, status, priority, district, market, notes, follow-up dates, and more.
        </div>
      </div>

      {/* Upcoming reports (placeholder cards) */}
      <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>More Reports — Coming Soon</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>
        {[
          { icon: <TrendingUp size={20} color="#10b981"/>, title: 'Campaign Analytics', desc: 'Budget, ROI, lead conversion per campaign', bg: '#10b981' },
          { icon: <Users size={20} color="#0ea5e9"/>,      title: 'Team Activity',      desc: 'Notes, calls, and tasks per employee', bg: '#0ea5e9' },
          { icon: <FileText size={20} color="#f59e0b"/>,   title: 'Market Analysis',    desc: 'Client density & conversion by district', bg: '#f59e0b' },
        ].map(card => (
          <div key={card.title} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', opacity: 0.6 }}>
            <div style={{ marginBottom: '10px' }}>{card.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{card.desc}</div>
            <div style={{ marginTop: '12px', padding: '4px 10px', background: `${card.bg}15`, border: `1px solid ${card.bg}33`, borderRadius: '8px', fontSize: '10px', fontWeight: 700, color: card.bg, display: 'inline-block' }}>COMING SOON</div>
          </div>
        ))}
      </div>
    </div>
  )
}
