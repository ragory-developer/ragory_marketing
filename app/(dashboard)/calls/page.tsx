'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, User, Calendar, Clock, Search, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, ArrowUpDown, History, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CallsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [calls, setCalls] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage]   = useState(1)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ 
      page: String(page), 
      limit: '20', 
      q,
      sortBy,
      sortOrder
    })
    try {
      const res = await fetch(`/api/calls?${params}`)
      const data = await res.json()
      setCalls(data.calls || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load call logs')
    } finally {
      setLoading(false)
    }
  }, [page, q, sortBy, sortOrder])

  useEffect(() => {
    load()
  }, [load])

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}m ${secs}s`
  }

  const getStatusColor = (duration: number) => {
    if (duration === 0) return '#ef4444' // Missed/Busy
    if (duration < 30) return '#f59e0b'  // Short
    return '#10b981'                     // Completed
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'32px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header Section */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(15, 23, 42, 0.4)', padding:'24px 32px', borderRadius:'24px', border:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', boxShadow:'0 10px 25px -5px rgba(79,70,229,0.5)' }}>
            <History size={28} />
          </div>
          <div>
            <h1 style={{ fontSize:'28px', fontWeight:900, color:'white', letterSpacing:'-0.03em' }}>Interaction History</h1>
            <p style={{ color:'#94a3b8', fontSize:'14px', marginTop:'2px', display:'flex', alignItems:'center', gap:'6px' }}>
              <Phone size={14} color="#818cf8" /> Comprehensive log of all voice engagements · <span style={{ color:'white', fontWeight:700 }}>{total} entries</span>
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-glow" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 24px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'14px', fontWeight:700, cursor:'pointer', transition:'all 0.3s' }}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh Stream
        </button>
      </div>

      {/* Control Bar */}
      <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:'500px' }}>
          <Search size={18} style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', color:'#64748b' }} />
          <input 
            value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} 
            placeholder="Filter by client name, phone, or discussion notes..." 
            className="input-field" 
            style={{ paddingLeft:'48px', width:'100%', height:'52px', fontSize:'15px', borderRadius:'16px', background:'rgba(15, 23, 42, 0.6)', border:'1px solid rgba(255,255,255,0.08)' }} 
          />
        </div>
        {q && (
           <button onClick={()=>{setQ(''); setPage(1)}} style={{ padding:'12px 20px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', borderRadius:'14px', fontWeight:700, cursor:'pointer' }}>Reset Filter</button>
        )}
      </div>

      {/* Modern Table Container */}
      <div className="table-container glass-panel" style={{ borderRadius:'24px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)', background:'rgba(15, 23, 42, 0.4)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              {[
                { label: 'Client Engagement', sort: 'clientId' },
                { label: 'Dialed Number', sort: 'phoneNumber' },
                { label: 'Engage Count', align: 'center' },
                { label: 'Session Duration', sort: 'duration' },
                { label: 'Discussion Summary' },
                { label: 'Engagement By', sort: 'authorId' },
                { label: 'Timeline', sort: 'createdAt' }
              ].map(h => (
                <th key={h.label} onClick={() => h.sort && toggleSort(h.sort)} style={{ padding:'20px', fontSize:'11px', color:'#94a3b8', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', textAlign: h.align==='center'?'center':'left', cursor: h.sort ? 'pointer' : 'default', whiteSpace:'nowrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent: h.align==='center'?'center':'flex-start' }}>
                    {h.label} {h.sort && <ArrowUpDown size={12} style={{ opacity: sortBy === h.sort ? 1 : 0.3 }} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:'100px', textAlign:'center', color:'#94a3b8' }}><RefreshCw size={32} className="spin" style={{ margin:'0 auto 16px auto', display:'block', opacity:0.3 }} /> Syncing with stream...</td></tr>
            ) : calls.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'100px', textAlign:'center', color:'#94a3b8' }}><MessageSquare size={48} style={{ margin:'0 auto 16px auto', display:'block', opacity:0.2 }} /> No interactions found.</td></tr>
            ) : calls.map(call => (
              <tr key={call.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(99,102,241,0.1)', color:'#818cf8', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'14px' }}>{call.client.name.charAt(0)}</div>
                    <div>
                      <div onClick={()=>setQ(call.client.name)} style={{ fontWeight:700, color:'white', fontSize:'15px', cursor:'pointer', transition:'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#818cf8'} onMouseLeave={e=>e.currentTarget.style.color='white'}>{call.client.name}</div>
                      <div style={{ color:'#64748b', fontSize:'12px', fontWeight:500 }}>{call.client.shopName || 'No associated shop'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'20px' }}>
                  <div style={{ color:'#e2e8f0', fontSize:'14px', fontWeight:600, display:'flex', alignItems:'center', gap:'8px' }}>
                    <Phone size={14} color="#64748b" /> {call.phoneNumber}
                  </div>
                </td>
                <td style={{ padding:'20px', textAlign:'center' }}>
                  <span style={{ padding:'4px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', fontSize:'12px', fontWeight:800 }}>
                    {call.client._count?.callLogs || 0}
                  </span>
                </td>
                <td style={{ padding:'20px' }}>
                  <div style={{ color: getStatusColor(call.duration), fontWeight:800, fontSize:'14px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <Clock size={14} /> {formatDuration(call.duration)}
                  </div>
                </td>
                <td style={{ padding:'20px', maxWidth:'350px' }}>
                  <div style={{ color:'#cbd5e1', fontSize:'14px', whiteSpace:'pre-wrap', lineHeight:1.5, maxHeight:'60px', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {call.note || <span style={{ color:'#475569', fontStyle:'italic' }}>No discussion notes recorded</span>}
                  </div>
                </td>
                <td style={{ padding:'20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'rgba(99,102,241,0.2)', color:'#a5b4fc', fontSize:'10px', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(99,102,241,0.3)' }}>{call.author.name.charAt(0)}</div>
                    <span style={{ fontSize:'14px', color:'#e2e8f0', fontWeight:600 }}>{call.author.name}</span>
                  </div>
                </td>
                <td style={{ padding:'20px' }}>
                  <div style={{ color:'white', fontSize:'14px', fontWeight:700 }}>{new Date(call.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
                  <div style={{ color:'#64748b', fontSize:'12px', fontWeight:500 }}>{new Date(call.createdAt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12: true })}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px' }}>
          <span style={{ color:'#64748b', fontSize:'14px', fontWeight:500 }}>Showing entries <span style={{ color:'white' }}>{(page-1)*20+1}–{Math.min(page*20,total)}</span> of <span style={{ color:'white' }}>{total}</span></span>
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <button 
              disabled={page===1} 
              onClick={()=>setPage(p=>p-1)} 
              style={{ padding:'10px 18px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'14px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', opacity: page===1 ? 0.4 : 1, transition:'all 0.2s' }}
              onMouseEnter={e=>!loading && page>1 && (e.currentTarget.style.background='rgba(255,255,255,0.1)')}
              onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.05)')}
            >
              <ChevronLeft size={20}/> Previous
            </button>
            <div style={{ padding:'10px 24px', background:'rgba(79,70,229,0.15)', border:'1px solid rgba(79,70,229,0.4)', color:'#a5b4fc', borderRadius:'14px', fontWeight:800, fontSize:'14px' }}>
              {page} <span style={{ opacity:0.3, margin:'0 8px' }}>/</span> {pages}
            </div>
            <button 
              disabled={page===pages} 
              onClick={()=>setPage(p=>p+1)} 
              style={{ padding:'10px 18px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', borderRadius:'14px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', opacity: page===pages ? 0.4 : 1, transition:'all 0.2s' }}
              onMouseEnter={e=>!loading && page<pages && (e.currentTarget.style.background='rgba(255,255,255,0.1)')}
              onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.05)')}
            >
              Next <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
