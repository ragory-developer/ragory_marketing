'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend,
} from 'recharts'
import {
  Users, TrendingUp, Phone, AlertTriangle,
  Megaphone, CheckSquare, UserCheck, Plus,
} from 'lucide-react'

// ─── Status colour palette (matches clients page) ───
const STATUS_COLORS: Record<string, string> = {
  PROSPECT:    '#6366f1', CONTACTED: '#0ea5e9', INTERESTED: '#f59e0b',
  NEGOTIATING: '#8b5cf6', CLIENTS:   '#10b981', LOST:       '#ef4444',
  INACTIVE:    '#6b7280',
}

// ─── KPI Card ────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
  trend?: { value: number; label: string }
}) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(30px)',
      border: `1px solid ${color}22`, borderRadius: '20px', padding: '24px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}11`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 ${color}22` }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${color}11` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{sub}</div>}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span style={{ color: trend.value >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ─── Custom Pie Tooltip ─────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'white' }}>
      <strong>{name}</strong>: {value}
    </div>
  )
}

// ─── Custom Line Tooltip ────────────────────────────
const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'white' }}>
      <div style={{ fontWeight: 700, marginBottom: '6px', color: '#a5b4fc' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

// ─── Panel wrapper ──────────────────────────────────
function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(30px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', ...style,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '20px' }}>{title}</div>
      {children}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [overview, setOverview] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/overview').then(r => r.json()),
      fetch('/api/analytics/trends').then(r => r.json()),
    ]).then(([ov, tr]) => {
      setOverview(ov)
      setTrends(tr)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(79,70,229,0.3)', borderTopColor: '#4f46e5', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading dashboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Build pie data from status breakdown
  const pieData = Object.entries(overview?.statusBreakdown ?? {}).map(([name, value]) => ({ name, value: value as number }))

  // Top markets bar data
  const marketData = (overview?.topMarkets ?? []).map((m: any) => ({ name: m.name, count: m.count }))

  const recentClients: any[] = overview?.recentClients ?? []

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Dashboard</h1>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Real-time overview of your marketing operations</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => router.push('/clients')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 16px -4px rgba(79,70,229,0.6)' }}
          >
            <Plus size={14} /> New Client
          </button>
          <button
            onClick={() => router.push('/campaigns')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <Megaphone size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Total Clients"      value={overview?.totalClients ?? 0}      icon={Users}        color="#6366f1" sub={`${overview?.newThisMonth ?? 0} added this month`} />
        <KpiCard label="Converted"          value={overview?.converted ?? 0}          icon={UserCheck}    color="#10b981" sub={`${overview?.conversionRate ?? 0}% conversion rate`} trend={{ value: 0, label: 'vs last month' }} />
        <KpiCard label="Calls This Week"    value={overview?.callsThisWeek ?? 0}      icon={Phone}        color="#0ea5e9" />
        <KpiCard label="Active Emergencies" value={overview?.activeEmergencies ?? 0}  icon={AlertTriangle}color="#ef4444" />
        <KpiCard label="Active Campaigns"   value={overview?.activeCampaigns ?? 0}    icon={Megaphone}    color="#8b5cf6" />
        <KpiCard label="Pending Tasks"      value={overview?.pendingTasks ?? 0}       icon={CheckSquare}  color="#f59e0b" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '24px' }}>
        {/* 30-Day Activity Line Chart */}
        <Panel title="30-Day Activity">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNotes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<LineTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', paddingTop: '12px' }} />
              <Area type="monotone" dataKey="clients" name="New Clients" stroke="#6366f1" fill="url(#gClients)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="notes"   name="Activities"  stroke="#0ea5e9" fill="url(#gNotes)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="calls"   name="Calls"       stroke="#10b981" fill="url(#gCalls)"   strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        {/* Status Donut */}
        <Panel title="Client Pipeline">
          {pieData.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: STATUS_COLORS[d.name] ?? '#6b7280', flexShrink: 0 }} />
                    {d.name} <strong style={{ color: 'white' }}>({d.value})</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Top Markets Bar Chart */}
        <Panel title="Top Markets">
          {marketData.length === 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No market data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={marketData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<PieTooltip />} />
                <Bar dataKey="count" name="Clients" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Recent Clients */}
        <Panel title="Recently Added">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentClients.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No clients yet</div>
            )}
            {recentClients.map((c: any) => (
              <div key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.shopName && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.shopName}</div>}
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: `${STATUS_COLORS[c.status] ?? '#6b7280'}22`, color: STATUS_COLORS[c.status] ?? '#6b7280', border: `1px solid ${STATUS_COLORS[c.status] ?? '#6b7280'}33`, flexShrink: 0 }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
