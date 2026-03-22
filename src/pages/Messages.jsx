import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Send, Paperclip } from 'lucide-react'

export default function Messages({ projectId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    if (!projectId) return
    loadMessages()
  }, [projectId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('homeowner_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoading(false)

    // Mark unread as read
    if (data?.length) {
      const unread = data.filter(m => !m.read_at && m.sender_role === 'practice')
      for (const m of unread) {
        await supabase.from('homeowner_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('id', m.id)
      }
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMsg.trim() || sending) return
    setSending(true)

    const { data, error } = await supabase.from('homeowner_messages').insert({
      project_id: projectId,
      sender_user_id: user.id,
      sender_role: 'homeowner',
      body: newMsg.trim(),
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMsg('')
    }
    setSending(false)
  }

  function formatTime(d) {
    if (!d) return ''
    const date = new Date(d)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    const time = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return time
    if (isYesterday) return `Yesterday ${time}`
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ' ' + time
  }

  // Group messages by date
  function getDateLabel(d) {
    const date = new Date(d)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  let lastDate = null

  return (
    <div className="max-w-2xl h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-[18px] font-light tracking-tight mb-1" style={{ color: 'var(--color-text)' }}>Messages</h1>
        <p className="text-[13px] text-[var(--color-muted)] font-light">
          Direct communication with your architect.
        </p>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[13px] text-[var(--color-muted)] font-light">No messages yet.</p>
            <p className="text-[11px] text-[var(--color-muted)] font-light mt-1">
              Send a message to start a conversation.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const dateLabel = getDateLabel(msg.created_at)
          const showDateLabel = dateLabel !== lastDate
          lastDate = dateLabel

          const isOwn = msg.sender_role === 'homeowner'
          const isFromPractice = msg.sender_role === 'practice'

          return (
            <div key={msg.id}>
              {showDateLabel && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-light shrink-0">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
              )}

              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`max-w-[75%] ${
                  isOwn
                    ? 'bg-[var(--color-accent)] text-white rounded-2xl rounded-br-md'
                    : 'glass-t rounded-2xl rounded-bl-md'
                } px-4 py-2.5`}>
                  {isFromPractice && (
                    <p className="text-[10px] tracking-[1px] uppercase font-medium mb-1 opacity-60">
                      Sean Pettet
                    </p>
                  )}
                  <p className="text-[13px] font-light leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  <p className={`text-[10px] mt-1 font-light ${isOwn ? 'text-white/50' : 'text-[var(--color-muted)]'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="shrink-0 flex gap-2 items-end">
        <div className="flex-1 glass-t flex items-end">
          <textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 px-4 py-3 bg-transparent text-[13px] font-light resize-none focus:outline-none"
            style={{ maxHeight: '120px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!newMsg.trim() || sending}
          className="w-10 h-10 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
