'use client'
import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, Globe, Briefcase, Send, Share2, Activity, Users,
  FileText, CheckCircle2, Inbox, UserPlus, Phone, Mail, Award, MapPin,
  Calendar, Lock, Sparkles, ChevronRight, MessageSquare
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

export default function SocialDashboard() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'composer' | 'history'>('inbox')
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }
  
  // Stats
  const [stats, setStats] = useState({ totalPosts: 0, totalMessages: 0, totalLikes: 0, totalReach: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Threads / Inbox State
  const [threads, setThreads] = useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  // Lead Conversion Form State
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadAssignee, setLeadAssignee] = useState('')
  const [leadMarket, setLeadMarket] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  // Dropdown lists
  const [usersList, setUsersList] = useState<any[]>([])
  const [marketsList, setMarketsList] = useState<any[]>([])

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  // Composer State
  const [postContent, setPostContent] = useState('')
  const [postImage, setPostImage] = useState('')
  const [postPlatforms, setPostPlatforms] = useState<string[]>(['FACEBOOK'])
  const [isPosting, setIsPosting] = useState(false)

  // WhatsApp State
  const [waTo, setWaTo] = useState('')
  const [waContent, setWaContent] = useState('')
  const [isSendingWa, setIsSendingWa] = useState(false)

  // History State
  const [postHistory, setPostHistory] = useState<any[]>([])
  const [waHistory, setWaHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchDropdowns()
  }, [])

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInbox()

      // Establish real-time updates via Server-Sent Events (SSE)
      const eventSource = new EventSource('/api/social/inbox/stream')

      eventSource.onmessage = (event) => {
        if (event.data === 'refresh') {
          pollInbox()
        }
      }

      eventSource.onerror = (e) => {
        console.error('[SSE Connection Error] Browser will automatically retry. State:', eventSource.readyState)
      }

      return () => {
        eventSource.close()
      }
    }
    if (activeTab === 'analytics') fetchAnalytics()
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  const fetchDropdowns = async () => {
    try {
      const [uRes, mRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/markets')
      ])
      if (uRes.ok) setUsersList(await uRes.json())
      if (mRes.ok) setMarketsList(await mRes.json())
    } catch (e) {
      console.error('Error fetching dropdown configurations', e)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/social/stats')
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  const markAsRead = async (platform: string, to: string) => {
    try {
      // Optimistically update UI state to make it feel instant
      setThreads(prev => prev.map(t => {
        if (t.platform === platform && t.to === to) {
          return { ...t, isRead: true }
        }
        return t
      }))

      // Persist to database
      await fetch('/api/social/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, to })
      })
    } catch (e) {
      console.error('Failed to mark thread as read:', e)
    }
  }

  useEffect(() => {
    if (selectedThreadId && threads.length > 0) {
      const thread = threads.find(t => t.id === selectedThreadId)
      if (thread && !thread.isRead) {
        markAsRead(thread.platform, thread.to)
      }
    }
  }, [selectedThreadId, threads])

  const fetchInbox = async () => {
    setLoadingInbox(true)
    try {
      const res = await fetch('/api/social/inbox')
      const data = await res.json()
      if (res.ok) {
        setThreads(data.threads || [])
      }
    } catch (e) {
      toast.error('Failed to load conversations')
    } finally {
      setLoadingInbox(false)
    }
  }

  const pollInbox = async () => {
    try {
      const res = await fetch('/api/social/inbox')
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch (e) {
      console.error('Failed to poll inbox:', e)
    }
  }

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/social/analytics')
      const data = await res.json()
      if (res.ok) setAnalyticsData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const [postsRes, waRes] = await Promise.all([
        fetch('/api/social/posts'),
        fetch('/api/social/whatsapp')
      ])
      const postsData = await postsRes.json()
      const waData = await waRes.json()
      setPostHistory(postsData.posts || [])
      setWaHistory(waData.messages || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const activeThread = threads.find(t => t.id === selectedThreadId)

  // Scroll to bottom when thread changes or new messages arrive
  useEffect(() => {
    if (selectedThreadId) {
      const timer = setTimeout(scrollToBottom, 60)
      return () => clearTimeout(timer)
    }
  }, [selectedThreadId])

  useEffect(() => {
    if (activeThread?.messages?.length) {
      scrollToBottom()
    }
  }, [activeThread?.messages?.length])

  // Auto pre-fill convert form fields whenever thread changes
  useEffect(() => {
    if (activeThread) {
      setLeadName(activeThread.senderName || '')
      setLeadPhone(activeThread.platform === 'WHATSAPP' ? activeThread.to : '')
      setLeadEmail('')
      setLeadAssignee('')
      setLeadMarket('')
    }
  }, [selectedThreadId, threads])

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeThread) return

    setIsSendingReply(true)
    try {
      const res = await fetch('/api/social/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: activeThread.platform,
          to: activeThread.to,
          content: replyText,
          direction: 'OUTBOUND',
          senderName: 'System'
        })
      })

      if (res.ok) {
        setReplyText('')
        toast.success('Reply sent!')
        fetchInbox()
        fetchStats()
      } else {
        toast.error('Failed to dispatch reply')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleConvertLead = async () => {
    if (!leadName.trim() || !activeThread) {
      return toast.error('Lead Name is required')
    }

    setIsConverting(true)
    try {
      const res = await fetch('/api/social/inbox/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: activeThread.platform,
          to: activeThread.to,
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          assignedToId: leadAssignee,
          marketId: leadMarket
        })
      })

      if (res.ok) {
        toast.success('Successfully converted to Client pipeline!')
        fetchInbox()
        fetchStats()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to capture lead')
      }
    } catch (e) {
      toast.error('Network error converting lead')
    } finally {
      setIsConverting(false)
    }
  }

  const handlePublishPost = async () => {
    if (!postContent.trim()) return toast.error('Content required')
    setIsPosting(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postContent, platforms: postPlatforms, imageUrl: postImage })
      })
      if (res.ok) {
        toast.success('Social post published successfully!')
        setPostContent('')
        setPostImage('')
        fetchStats()
      }
    } catch (e) {
      toast.error('Failed to post')
    } finally {
      setIsPosting(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!waTo.trim() || !waContent.trim()) return toast.error('Recipient and message required')
    setIsSendingWa(true)
    try {
      const res = await fetch('/api/social/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: waTo, content: waContent })
      })
      if (res.ok) {
        toast.success('WhatsApp message sent!')
        setWaTo('')
        setWaContent('')
        fetchStats()
      }
    } catch (e) {
      toast.error('Failed to send WhatsApp message')
    } finally {
      setIsSendingWa(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles color="#ec4899" size={26} /> Social Media CRM & Inbox
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            HubSpot-style unified threaded social inbox, instant lead capture pipeline, and interactive performance charts.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Outbound Social Posts', value: stats.totalPosts, icon: FileText, color: '#3b82f6' },
          { label: 'Outbound Direct Messages', value: stats.totalMessages, icon: MessageCircle, color: '#10b981' },
          { label: 'Total Mock Engagement', value: stats.totalLikes, icon: Activity, color: '#ec4899' },
          { label: 'Total Mock Reach', value: stats.totalReach, icon: Users, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${s.color}33`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${s.color}22`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                {loadingStats ? '...' : s.value.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        {[
          { id: 'inbox', label: 'Threaded Inbox', icon: Inbox },
          { id: 'analytics', label: 'CRM Funnel Analytics', icon: Activity },
          { id: 'composer', label: 'Publish & Composer', icon: Share2 },
          { id: 'history', label: 'Outbound Logs', icon: FileText },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === t.id ? 'rgba(236,72,153,0.15)' : 'transparent',
              color: activeTab === t.id ? '#ec4899' : '#9ca3af',
              border: activeTab === t.id ? '1px solid rgba(236,72,153,0.4)' : '1px solid transparent'
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Panels */}
      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>

        {/* 1. THREADED INBOX VIEW */}
        {activeTab === 'inbox' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', height: '620px' }}>
            
            {/* Column 1: Conversations List */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.3)' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#ec4899" /> Conversations ({threads.length})
                </div>
                {threads.filter(t => !t.isRead).length > 0 && (
                  <span style={{ fontSize: '10px', background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800, boxShadow: '0 0 6px rgba(236,72,153,0.5)' }}>
                    {threads.filter(t => !t.isRead).length} new
                  </span>
                )}
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {loadingInbox ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading inbox...</div>
                ) : threads.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No messages in inbox.</div>
                ) : (
                  threads.map(thread => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`inbox-thread-card ${selectedThreadId === thread.id ? 'selected' : ''} ${!thread.isRead ? 'unread' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ 
                          fontWeight: !thread.isRead ? 800 : 600, 
                          color: 'white', 
                          fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '160px',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                          {!thread.isRead && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899', display: 'inline-block', boxShadow: '0 0 8px #ec4899' }} />
                          )}
                          {thread.senderName || thread.to}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!thread.isRead && (
                            <span style={{ fontSize: '9px', background: 'rgba(236,72,153,0.2)', color: '#f472b6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(236,72,153,0.4)' }}>
                              NEW
                            </span>
                          )}
                          <span style={{ fontSize: '10px', color: !thread.isRead ? '#f472b6' : '#6b7280', fontWeight: !thread.isRead ? 700 : 400 }}>
                            {new Date(thread.latestMessageTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: '12px', 
                        color: !thread.isRead ? '#f1f5f9' : '#9ca3af', 
                        fontWeight: !thread.isRead ? 600 : 400,
                        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: '8px' 
                      }}>
                        {thread.latestMessage}
                      </div>

                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                          background: thread.platform === 'WHATSAPP' ? 'rgba(16,185,129,0.15)' : thread.platform === 'FACEBOOK' ? 'rgba(59,130,246,0.15)' : 'rgba(10,102,194,0.15)',
                          color: thread.platform === 'WHATSAPP' ? '#10b981' : thread.platform === 'FACEBOOK' ? '#3b82f6' : '#0A66C2'
                        }}>
                          {thread.platform}
                        </span>

                        {thread.isLeadCaptured ? (
                          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Lead Captured
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Unconverted</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Threaded Message Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {activeThread ? (
                <>
                  {/* Chat Header */}
                  <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white' }}>{activeThread.senderName || activeThread.to}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {activeThread.client ? (
                          <>
                            {activeThread.client.phone && <span>{activeThread.client.phone}</span>}
                            {activeThread.client.phone && activeThread.client.email && <span>•</span>}
                            {activeThread.client.email && <span>{activeThread.client.email}</span>}
                          </>
                        ) : (
                          <span>{activeThread.to}</span>
                        )}
                        <span>•</span>
                        <span>via {activeThread.platform}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div 
                    ref={messagesContainerRef}
                    style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.15)' }}
                  >
                    {activeThread.messages.map((msg: any) => {
                      const isInbound = msg.direction === 'INBOUND'
                      return (
                        <div
                          key={msg.id}
                          style={{
                            maxWidth: '75%', alignSelf: isInbound ? 'flex-start' : 'flex-end',
                            display: 'flex', flexDirection: 'column', gap: '4px'
                          }}
                        >
                          <div style={{
                            padding: '12px 16px', borderRadius: '14px',
                            background: isInbound ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #ec4899, #be185d)',
                            color: 'white', fontSize: '14px', lineHeight: 1.5,
                            border: isInbound ? '1px solid rgba(255,255,255,0.06)' : 'none'
                          }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: '9px', color: '#6b7280', alignSelf: isInbound ? 'flex-start' : 'flex-end' }}>
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Send Input */}
                  <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={`Reply to ${activeThread.senderName || activeThread.to}...`}
                      className="input-field"
                      style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                      onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      style={{
                        padding: '12px 20px', background: '#ec4899', color: 'white', border: 'none',
                        borderRadius: '8px', cursor: (isSendingReply || !replyText.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (isSendingReply || !replyText.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6b7280', gap: '12px' }}>
                  <Inbox size={48} />
                  <span>Select a conversation to start messaging</span>
                </div>
              )}
            </div>

            {/* Column 3: Contextual CRM Sidebar */}
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.3)', padding: '20px', overflowY: 'auto' }}>
              {activeThread ? (
                activeThread.isLeadCaptured ? (
                  /* CONVERTED: View CRM client details card */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                        <Award size={32} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{activeThread.client?.name}</h3>
                      <span style={{
                        display: 'inline-block', marginTop: '6px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)'
                      }}>
                        {activeThread.client?.status} Lead
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                        <Phone size={14} color="#9ca3af" /> <span>{activeThread.client?.phone || 'No phone number'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                        <Mail size={14} color="#9ca3af" /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeThread.client?.email || 'No email'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
                        <Users size={14} color="#9ca3af" /> <span>Rep: {activeThread.client?.assignedTo?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.location.href = `/clients/${activeThread.clientId}`}
                      style={{
                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.06)', color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      View CRM Profile <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  /* UNCONVERTED: Capture lead form */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserPlus size={16} color="#ec4899" /> Convert to Lead
                      </h3>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Capture contact details to track this prospect in your sales pipeline.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>Contact Name *</label>
                        <input
                          type="text"
                          value={leadName}
                          onChange={e => setLeadName(e.target.value)}
                          placeholder="e.g. Bruce Wayne"
                          className="input-field"
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>Phone Number</label>
                        <input
                          type="text"
                          value={leadPhone}
                          onChange={e => setLeadPhone(e.target.value)}
                          placeholder="e.g. +16075550144"
                          className="input-field"
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>Email Address</label>
                        <input
                          type="email"
                          value={leadEmail}
                          onChange={e => setLeadEmail(e.target.value)}
                          placeholder="e.g. bruce@wayne.com"
                          className="input-field"
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>Assigned Representative</label>
                        <select
                          value={leadAssignee}
                          onChange={e => setLeadAssignee(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', padding: '10px', fontSize: '13px', background: '#0f172a' }}
                        >
                          <option value="">Select Representative...</option>
                          {usersList.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>Market Area</label>
                        <select
                          value={leadMarket}
                          onChange={e => setLeadMarket(e.target.value)}
                          className="input-field"
                          style={{ width: '100%', padding: '10px', fontSize: '13px', background: '#0f172a' }}
                        >
                          <option value="">Select Market...</option>
                          {marketsList.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleConvertLead}
                      disabled={isConverting || !leadName.trim()}
                      style={{
                        width: '100%', padding: '12px', background: '#ec4899', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: (isConverting || !leadName.trim()) ? 'not-allowed' : 'pointer',
                        fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        marginTop: '10px', opacity: (isConverting || !leadName.trim()) ? 0.6 : 1
                      }}
                    >
                      {isConverting ? 'Saving Lead...' : <><UserPlus size={14} /> Add to CRM Pipeline</>}
                    </button>
                  </div>
                )
              ) : (
                <div style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', paddingTop: '40px' }}>No chat selected</div>
              )}
            </div>

          </div>
        )}

        {/* 2. FUNNEL ANALYTICS VIEW */}
        {activeTab === 'analytics' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Top Info */}
            <div style={{ background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '10px' }}>
              <Activity size={20} color="#ec4899" />
              <div>
                <h4 style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Enterprise Analytics Module</h4>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '3px' }}>
                  Track social media acquisition channels, conversation-to-deal conversion funnel metrics, and customer response times in real-time.
                </p>
              </div>
            </div>

            {loadingAnalytics ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Computing reports...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                
                {/* Funnel Chart */}
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CRM Acquisition Funnel</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analyticsData?.funnelData} layout="vertical" margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis type="category" dataKey="step" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }} />
                      <Bar dataKey="count" fill="#ec4899" radius={[0, 6, 6, 0]}>
                        {analyticsData?.funnelData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart: Channel Share */}
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Channel</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                    <ResponsiveContainer width={180} height={200}>
                      <PieChart>
                        <Pie
                          data={analyticsData?.channelData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData?.channelData?.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analyticsData?.channelData?.map((entry: any, index: number) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[index % COLORS.length] }} />
                          <span style={{ color: 'white', fontWeight: 600 }}>{entry.name}</span>
                          <span style={{ color: '#9ca3af' }}>({entry.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Area Chart: Trend */}
                <div style={{ background: 'rgba(15,23,42,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>7-Day Traffic & Conversion Trend</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={analyticsData?.trendData} margin={{ left: -20, right: 10 }}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorInq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }} />
                      <Legend />
                      <Area type="monotone" dataKey="inquiries" name="Inbound Chats" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInq)" strokeWidth={2} />
                      <Area type="monotone" dataKey="leads" name="Captured CRM Leads" stroke="#ec4899" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}
          </div>
        )}

        {/* 3. OUTBOUND COMPOSER VIEW */}
        {activeTab === 'composer' && (
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* Social Post Composer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Share2 size={18} color="#ec4899" /> Social Post Publisher
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>
                  Write and publish updates simultaneously to Facebook and LinkedIn.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Select Channels</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setPostPlatforms(prev => prev.includes('FACEBOOK') ? prev.filter(p => p !== 'FACEBOOK') : [...prev, 'FACEBOOK'])}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: postPlatforms.includes('FACEBOOK') ? '1px solid #1877F2' : '1px solid rgba(255,255,255,0.1)', background: postPlatforms.includes('FACEBOOK') ? 'rgba(24,119,242,0.1)' : 'rgba(0,0,0,0.2)', color: postPlatforms.includes('FACEBOOK') ? '#1877F2' : '#9ca3af', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <Globe size={18} /> Facebook
                  </button>
                  <button
                    onClick={() => setPostPlatforms(prev => prev.includes('LINKEDIN') ? prev.filter(p => p !== 'LINKEDIN') : [...prev, 'LINKEDIN'])}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: postPlatforms.includes('LINKEDIN') ? '1px solid #0A66C2' : '1px solid rgba(255,255,255,0.1)', background: postPlatforms.includes('LINKEDIN') ? 'rgba(10,102,194,0.1)' : 'rgba(0,0,0,0.2)', color: postPlatforms.includes('LINKEDIN') ? '#0A66C2' : '#9ca3af', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <Briefcase size={18} /> LinkedIn
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Post Body</label>
                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="What is your announcement?"
                  className="input-field"
                  style={{ width: '100%', minHeight: '130px', padding: '16px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Asset URL (Image/Video Link)</label>
                <input
                  value={postImage}
                  onChange={e => setPostImage(e.target.value)}
                  placeholder="https://example.com/asset.jpg"
                  className="input-field"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                />
              </div>

              <button
                onClick={handlePublishPost}
                disabled={isPosting || postPlatforms.length === 0 || !postContent.trim()}
                style={{ padding: '12px 24px', background: '#ec4899', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: (isPosting || postPlatforms.length === 0 || !postContent.trim()) ? 'not-allowed' : 'pointer', opacity: (isPosting || postPlatforms.length === 0 || !postContent.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-start' }}
              >
                {isPosting ? 'Publishing...' : <><Send size={16} /> Send Post</>}
              </button>
            </div>

            {/* WhatsApp Outbound */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '32px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={18} color="#10b981" /> Outbound WhatsApp Blast
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>
                  Send a one-to-one WhatsApp message directly via API.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Recipient Number (with country code)</label>
                <input
                  value={waTo}
                  onChange={e => setWaTo(e.target.value)}
                  placeholder="e.g. +14155552671"
                  className="input-field"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>Message Body</label>
                <textarea
                  value={waContent}
                  onChange={e => setWaContent(e.target.value)}
                  placeholder="Type WhatsApp template message..."
                  className="input-field"
                  style={{ width: '100%', minHeight: '130px', padding: '16px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleSendWhatsApp}
                disabled={isSendingWa || !waTo.trim() || !waContent.trim()}
                style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: (isSendingWa || !waTo.trim() || !waContent.trim()) ? 'not-allowed' : 'pointer', opacity: (isSendingWa || !waTo.trim() || !waContent.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', alignSelf: 'flex-start' }}
              >
                {isSendingWa ? 'Sending...' : <><Send size={16} /> Send Message</>}
              </button>
            </div>

          </div>
        )}

        {/* 4. HISTORY LOGS VIEW */}
        {activeTab === 'history' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {loadingHistory ? (
              <div style={{ color: '#9ca3af', padding: '40px', textAlign: 'center' }}>Loading history...</div>
            ) : (
              <>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Share2 size={16} color="#3b82f6" /> Post History
                  </h3>
                  {postHistory.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>No social posts published yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {postHistory.map(post => (
                        <div key={post.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: post.platform === 'FACEBOOK' ? '#1877F2' : '#0A66C2' }}>{post.platform}</span>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>{new Date(post.createdAt).toLocaleString()}</span>
                          </div>
                          <p style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '12px' }}>{post.content}</p>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#9ca3af' }}>
                            <span>👍 {post.mockLikes} Likes</span>
                            <span>📊 {post.mockReach} Reach</span>
                            <span style={{ color: '#10b981' }}>✓ Sent</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageCircle size={16} color="#10b981" /> WhatsApp Outbox
                  </h3>
                  {waHistory.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>No messages sent yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {waHistory.map(msg => (
                        <div key={msg.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>To: {msg.to}</span>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>{msg.content}</p>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#10b981' }}>
                            <span>✓✓ Delivered</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
