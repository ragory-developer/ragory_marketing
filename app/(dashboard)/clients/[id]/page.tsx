'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { User, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  PROSPECT:    '#6366f1', CONTACTED: '#0ea5e9', INTERESTED: '#f59e0b',
  NEGOTIATING: '#8b5cf6', CONVERTED:  '#10b981', LOST:       '#ef4444', INACTIVE: '#6b7280',
}
const NOTE_TYPE_COLORS: Record<string, string> = {
  GENERAL:'#6366f1', CALL:'#0ea5e9', VISIT:'#10b981', FOLLOW_UP:'#f59e0b', COMPLAINT:'#ef4444'
}
const STATUSES = ['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CONVERTED','LOST','INACTIVE']
const NOTE_TYPES = ['GENERAL','CALL','VISIT','FOLLOW_UP','COMPLAINT']

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('GENERAL')
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [modalStatus, setModalStatus] = useState('')

  useEffect(() => {
    if (!id) return
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setClient(data)
        setModalStatus(data.status)
      } catch (e) {
        toast.error('Could not load client details')
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [id])

  const addNote = async () => {
    if (!noteText.trim() || !client) return
    
    // Build payload
    const payload: any = { content: noteText, type: noteType }
    if (feedbackRating > 0) payload.content = `${noteText} [Rating: ${feedbackRating}/10]`

    const res = await fetch(`/api/clients/${client.id}/notes`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    })

    if (modalStatus && modalStatus !== client.status) {
      await fetch(`/api/clients/${client.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status: modalStatus, rating: feedbackRating > 0 ? feedbackRating : undefined })
      })
    } else if (feedbackRating > 0) {
      await fetch(`/api/clients/${client.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ rating: feedbackRating })
      })
    }

    if (res.ok) {
      toast.success('Note logged!')
      setNoteText(''); setFeedbackRating(0)
      const updated = await (await fetch(`/api/clients/${client.id}`)).json()
      setClient(updated)
      setModalStatus(updated.status)
    } else toast.error('Failed to log note')
  }

  if (loading) return <div style={{ padding:'40px', color:'#9ca3af' }}>Loading client details...</div>
  if (!client) return <div style={{ padding:'40px', color:'#ef4444' }}>Client not found.</div>

  return (
    <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', flexDirection:'column', height:'100%', position:'relative', zIndex:1 }}>
      {/* Top Bar Navigation */}
      <div style={{ marginBottom:'24px', display:'flex', alignItems:'center', gap:'16px' }}>
        <button onClick={() => router.back()} style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#d1d5db', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:600, transition:'all 0.2s' }}>
          <ChevronLeft size={16} /> Back to Clients
        </button>
        <h1 style={{ color:'white', fontSize:'24px', fontWeight:700 }}>Client Details</h1>
      </div>

      <div style={{ display:'flex', gap:'24px', flex:1, minHeight:0 }}>
        {/* ===== LEFT: Info + Log Activity ===== */}
        <div className="anim-pane-left glass-shine" style={{ flex:'0 0 550px', background:'rgba(15, 23, 42, 0.8)', backdropFilter:'blur(30px)', WebkitBackdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 16px 40px 0 rgba(0,0,0,0.6)', borderRadius:'24px', padding:'32px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'28px' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700, color:'white', flexShrink:0 }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={{ color:'white', fontSize:'20px', fontWeight:700, lineHeight:1.2 }}>{client.name}</h2>
              {client.shopName && <p style={{ color:'#818cf8', fontSize:'13px', marginTop:'2px' }}>🏪 {client.shopName}</p>}
            </div>
            <span style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700, background:STATUS_COLORS[client.status]+'22', color:STATUS_COLORS[client.status], border:`1px solid ${STATUS_COLORS[client.status]}44`, flexShrink:0 }}>{client.status}</span>
          </div>

          {/* Quick Info */}
          <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:'12px', padding:'20px', border:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
            {[['📞','Phone',client.phone],['📞','Alt',client.alternativePhone||'—'],['📧','Email',client.email||'—'],['🏢','Business',client.businessType||'—'],['📍','Location',`${client.district||''}${client.area?', '+client.area:''}`||'—'],['🎯','Priority',client.priority],['📢','Source',client.source||'—'],['👤','Added by',client.createdBy?.name],['📅','Added',new Date(client.createdAt).toLocaleDateString()]].map(([ic,l,v])=>(
              <div key={l}><div style={{ color:'#9ca3af', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px', display:'flex', alignItems:'center', gap:'4px' }}>{ic} {l}</div><div style={{ color:'#f3f4f6', fontSize:'13px', fontWeight:600 }}>{v}</div></div>
            ))}
            {client.address && <div style={{ gridColumn:'1/-1', marginTop:'4px' }}><div style={{ color:'#9ca3af', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>📍 Address</div><div style={{ color:'#f3f4f6', fontSize:'13px', lineHeight:'1.5' }}>{client.address}</div></div>}
          </div>

          {/* === Log Activity Form === */}
          <div style={{ background:'rgba(99,102,241,0.05)', borderRadius:'14px', padding:'20px', border:'1px solid rgba(99,102,241,0.15)', flex:1 }}>
            <h3 style={{ color:'white', fontSize:'15px', fontWeight:700, marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#818cf8', display:'inline-block' }}/> Log Activity
            </h3>

            {/* Activity Type */}
            <div style={{ marginBottom:'20px' }}>
              <div style={{ color:'#9ca3af', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Activity Type</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {NOTE_TYPES.map(t=>(
                  <button key={t} onClick={()=>setNoteType(t)} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'11px', fontWeight:700, border:'1px solid', cursor:'pointer', transition:'all 0.2s', borderColor: noteType===t ? NOTE_TYPE_COLORS[t] : 'rgba(255,255,255,0.15)', background: noteType===t ? NOTE_TYPE_COLORS[t]+'33' : 'rgba(0,0,0,0.2)', color: noteType===t ? NOTE_TYPE_COLORS[t] : '#d1d5db' }}>{t}</button>
                ))}
              </div>
            </div>

            {/* Status Update */}
            <div style={{ marginBottom:'20px' }}>
              <div style={{ color:'#9ca3af', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Update Status</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {STATUSES.map(s=>(
                  <button key={s} onClick={()=>setModalStatus(s)} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'11px', fontWeight:700, border:'1px solid', cursor:'pointer', transition:'all 0.2s', borderColor: modalStatus===s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.15)', background: modalStatus===s ? STATUS_COLORS[s]+'33' : 'rgba(0,0,0,0.2)', color: modalStatus===s ? STATUS_COLORS[s] : '#d1d5db' }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Feedback Rating 1–10 */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ color:'#6b7280', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Feedback Score (1–10)</div>
              <div style={{ display:'flex', gap:'4px' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(r=>(
                  <button key={r} onClick={()=>setFeedbackRating(feedbackRating===r?0:r)} style={{ width:'30px', height:'30px', borderRadius:'6px', border:'1px solid', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                    borderColor: feedbackRating>=r ? (r>=8?'#10b981':r>=5?'#f59e0b':'#6366f1') : 'rgba(255,255,255,0.1)',
                    background: feedbackRating>=r ? (r>=8?'rgba(16,185,129,0.25)':r>=5?'rgba(245,158,11,0.25)':'rgba(99,102,241,0.25)') : 'transparent',
                    color: feedbackRating>=r ? (r>=8?'#10b981':r>=5?'#f59e0b':'#818cf8') : '#6b7280' }}>{r}
                  </button>
                ))}
              </div>
              {feedbackRating > 0 && <div style={{ marginTop:'6px', fontSize:'12px', color: feedbackRating>=8?'#10b981':feedbackRating>=5?'#f59e0b':'#818cf8', fontWeight:600 }}>
                {feedbackRating}/10 — {feedbackRating>=8?'🔥 High Potential':feedbackRating>=5?'⚡ Moderate':'❄️ Low Interest'}
              </div>}
            </div>

            {/* Note Textarea */}
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Write a note, call outcome, visit summary..." rows={4} className="input-field" style={{ width:'100%', fontSize:'14px', padding:'16px', resize:'none', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'12px', marginBottom:'16px', color:'white' }} />

            <button onClick={addNote} disabled={!noteText.trim()} className={`hover-lift ${noteText.trim() ? 'btn-glow' : ''}`} style={{ width:'100%', padding:'14px', background: noteText.trim() ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.05)', color: noteText.trim() ? 'white' : '#6b7280', border:'none', borderRadius:'12px', cursor: noteText.trim() ? 'pointer' : 'not-allowed', fontWeight:700, fontSize:'15px', transition:'all 0.2s', letterSpacing:'0.02em', boxShadow: noteText.trim() ? '0 8px 20px -6px rgba(79,70,229,0.5)' : 'none' }}>
              {modalStatus !== client.status ? `Save & Update → ${modalStatus}` : 'Save Activity Log'}
            </button>
          </div>
        </div>

        {/* ===== RIGHT: Activity History Table ===== */}
        <div className="anim-pane-right glass-shine" style={{ flex:1, background:'rgba(15, 23, 42, 0.7)', backdropFilter:'blur(30px)', WebkitBackdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 16px 40px 0 rgba(0,0,0,0.6)', borderRadius:'24px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header sticky */}
          <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,0,0,0.2)' }}>
            <h3 style={{ color:'white', fontSize:'16px', fontWeight:700, display:'flex', alignItems:'center', gap:'10px' }}>
              Activity History
              <span style={{ padding:'2px 10px', borderRadius:'20px', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)', fontSize:'12px', color:'#818cf8', fontWeight:700 }}>{client.clientNotes?.length || 0}</span>
            </h3>
            <span style={{ fontSize:'12px', color:'#6b7280' }}>Latest first</span>
          </div>

          {client.clientNotes?.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', color:'#4b5563' }}>
              <div style={{ fontSize:'48px' }}>📋</div>
              <div style={{ fontSize:'14px' }}>No activity logged yet</div>
            </div>
          ) : (
            <div style={{ flex:1, overflowY:'auto' }}>
              {/* Table header */}
              <div style={{ display:'grid', gridTemplateColumns:'110px 1fr 80px 160px', gap:'16px', padding:'12px 24px', background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'sticky', top:0, zIndex:10 }}>
                {['Type','Note / Content','Score','Date & Author'].map(h=>(
                  <div key={h} style={{ fontSize:'11px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {client.clientNotes?.map((n:any, idx:number) => {
                const col = NOTE_TYPE_COLORS[n.type] || '#6366f1'
                const isAuto = n.content.includes('changed from')
                const ratingMatch = n.content.match(/\[Rating: (\d+)\/10\]/)
                const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
                const noteContent = ratingMatch ? n.content.replace(/ \[Rating: \d+\/10\]/, '') : n.content
                return (
                  <div key={n.id} className="anim-row"
                    style={{ animationDelay: `${idx * 0.05 + 0.2}s`, display:'grid', gridTemplateColumns:'110px 1fr 80px 160px', gap:'16px', padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.03)', background: isAuto ? 'rgba(0,0,0,0.2)' : 'transparent', alignItems:'center', transition:'all 0.2s ease' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)')}
                    onMouseLeave={e=>(e.currentTarget.style.background= isAuto?'rgba(0,0,0,0.2)':'transparent')}>
                    {/* Type badge */}
                    <div>
                      <span style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:700, background:col+'22', color:col, border:`1px solid ${col}33`, textTransform:'uppercase', letterSpacing:'0.04em', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                        {isAuto?'⚙':'●'} {n.type}
                      </span>
                    </div>
                    {/* Note content */}
                    <div style={{ color: isAuto?'#9ca3af':'#f3f4f6', fontSize:'14px', lineHeight:'1.5', fontStyle: isAuto?'italic':'normal' }}>
                      {noteContent}
                    </div>
                    {/* Score */}
                    <div>
                      {rating ? (
                        <span style={{ fontWeight:700, fontSize:'16px', color: rating>=8?'#10b981':rating>=5?'#f59e0b':'#818cf8' }}>
                          {rating}<span style={{ fontSize:'11px', color:'#6b7280', fontWeight:500 }}>/10</span>
                        </span>
                      ) : <span style={{ color:'#4b5563', fontSize:'14px' }}>—</span>}
                    </div>
                    {/* Date + Author */}
                    <div style={{ color:'#6b7280', fontSize:'12px', lineHeight:'1.5' }}>
                      <div style={{ color:'#d1d5db' }}>{new Date(n.createdAt).toLocaleDateString('en',{day:'2-digit',month:'short',year:'numeric'})}</div>
                      <div style={{ color:'#6b7280', fontSize:'11px' }}>{new Date(n.createdAt).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})} · {n.author?.name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
