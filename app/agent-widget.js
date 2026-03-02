'use client'

import { useEffect, useRef, useState } from 'react'

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 0.2, 0.4].map((d, i) => (
        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: `agentBounce 1s ease ${d}s infinite` }} />
      ))}
    </div>
  )
}

export default function AgentWidget() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('agent_open') === '1' } catch { return false } })
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je peux répondre à vos questions et effectuer des actions directement. Naviguez librement, je suis là !' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState({ x: null, y: null })
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [minimized, setMinimized] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef()
  const inputRef = useRef()
  const widgetRef = useRef()

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  // Drag logic
  function onMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('textarea')) return
    setDragging(true)
    const rect = widgetRef.current.getBoundingClientRect()
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    e.preventDefault()
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging) return
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y
      const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 380)
      const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 500)
      setPos({ x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) })
    }
    function onMouseUp() { setDragging(false) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [dragging, dragOffset])

  async function envoyer() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) })
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.message, actions: data.actions || [] }])
      if (!open) setUnread(u => u + 1)
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Erreur de connexion. Réessayez.' }])
    }
    setLoading(false)
  }

  function formatMessage(text) {
    if (!text) return ''
    return text.split('\n').map((line, i) => {
      if (line.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}><span style={{ color: '#3b82f6' }}>·</span><span>{line.slice(2)}</span></div>
      if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />
      return <div key={i}>{line}</div>
    })
  }

  function badgeAction(action, j) {
    const configs = {
      marquer_paye: { label: '✅ Payé', color: '#34d399' },
      envoyer_relance: { label: '📧 Relance', color: '#60a5fa' },
      marquer_retard: { label: '⚠️ Retard', color: '#fb923c' },
      modifier_template: { label: '✏️ Template modifié', color: '#a78bfa' },
      modifier_agence: { label: '🏢 Agence modifiée', color: '#60a5fa' },
      toggle_relances_auto: { label: '⚡ Relances auto', color: '#fbbf24' },
      envoyer_relance_tous: { label: '📧 Relances envoyées', color: '#60a5fa' },
    }
    const c = configs[action.type] || { label: action.type, color: '#94a3b8' }
    return (
      <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: c.color + '18', color: c.color, border: `1px solid ${c.color}30`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '500', marginRight: '4px', marginTop: '4px' }}>
        {c.label} — {action.nom}
      </span>
    )
  }

  // Position par défaut (coin bas droit)
  const style = pos.x !== null
    ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : { right: '24px', bottom: '24px' }

  return (
    <>
      <style>{`
        @keyframes agentBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes agentPop { from{opacity:0;transform:scale(0.9) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes agentFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .agent-msg { animation: agentFadeIn 0.25s ease; }
        .agent-input:focus { outline: none; }
        .agent-send:hover { background: #1d4ed8 !important; }
        .agent-close:hover { background: rgba(255,255,255,0.12) !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      `}</style>

      {/* Bulle flottante */}
      {!open && (
        <button onClick={() => { setOpen(true); localStorage.setItem('agent_open', '1') }} style={{ position: 'fixed', ...style, width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 24px rgba(37,99,235,0.4)', zIndex: 9999, transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(37,99,235,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,99,235,0.4)' }}>
          🤖
          {unread > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#f87171', fontSize: '11px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f0f13' }}>{unread}</span>
          )}
        </button>
      )}

      {/* Widget chat */}
      {open && (
        <div ref={widgetRef} style={{ position: 'fixed', ...style, width: '360px', height: minimized ? 'auto' : '480px', background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', system-ui, sans-serif", animation: 'agentPop 0.2s ease', overflow: 'hidden', userSelect: dragging ? 'none' : 'auto' }}>

          {/* Header — draggable */}
          <div onMouseDown={onMouseDown} style={{ padding: '12px 14px', background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))', borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', cursor: dragging ? 'grabbing' : 'grab', borderRadius: minimized ? '18px' : '18px 18px 0 0', flexShrink: 0 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>Assistant IA</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Accès données temps réel</div>
            </div>
            <button className="agent-close" onClick={() => setMinimized(!minimized)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', transition: 'background 0.15s', flexShrink: 0 }}>
              {minimized ? '▲' : '▼'}
            </button>
            <button className="agent-close" onClick={() => { setOpen(false); setPos({ x: null, y: null }); localStorage.removeItem('agent_open') }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'background 0.15s', flexShrink: 0 }}>
              ×
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, i) => (
                  <div key={i} className="agent-msg" style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
                    )}
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{ background: msg.role === 'user' ? '#2563eb' : 'rgba(255,255,255,0.05)', border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)', borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px', padding: '9px 12px', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                      </div>
                      {msg.actions?.length > 0 && (
                        <div style={{ marginTop: '6px' }}>{msg.actions.map((a, j) => badgeAction(a, j))}</div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>👤</div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="agent-msg" style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🤖</div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px 14px 14px 14px', padding: '10px 14px' }}>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  ref={inputRef}
                  className="agent-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                  placeholder="Posez une question... (Entrée)"
                  rows={1}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#f1f5f9', fontSize: '13px', fontFamily: 'inherit', resize: 'none', lineHeight: 1.4, maxHeight: '80px' }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px' }}
                />
                <button className="agent-send" onClick={envoyer} disabled={loading || !input.trim()} style={{ width: '34px', height: '34px', borderRadius: '9px', background: !input.trim() || loading ? 'rgba(37,99,235,0.3)' : '#2563eb', border: 'none', color: 'white', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s', fontSize: '14px' }}>
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}