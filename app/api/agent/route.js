'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)/gm, '· $1')
    .replace(/\n/g, '<br/>')
}

export default function Agent() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant GestImmo. Je peux consulter vos données en temps réel, envoyer des relances, modifier des informations et bien plus. Comment puis-je vous aider ?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [nomAgence, setNomAgence] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) setNomAgence(agence.nom)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function envoyer() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply, actions: data.actions }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Désolé, une erreur s\'est produite.' }])
    }
    setLoading(false)
  }

  const suggestions = [
    'Qui est en retard ce mois ?',
    'Envoie une relance à tous les locataires en retard',
    'Quel est mon taux de recouvrement ?',
    'Montre-moi les contrats qui expirent bientôt',
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1a1a24; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #64748b; text-decoration: none; transition: all 0.2s; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        @keyframes dots { 0%,80%,100%{opacity:0;transform:scale(0)} 40%{opacity:1;transform:scale(1)} }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #475569; display: inline-block; animation: dots 1.2s infinite; }
        textarea { font-family: inherit; resize: none; }
        textarea:focus { outline: none; }
        .suggestion { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 7px 14px; font-size: 13px; color: #64748b; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
        .suggestion:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</div>
            {nomAgence && <div style={{ fontSize: '11px', color: '#475569' }}>{nomAgence}</div>}
          </div>
        </a>
        {[{href:'/dashboard',label:'Dashboard'},{href:'/stats',label:'Statistiques'},{href:'/historique',label:'Historique'}].map(l => (
          <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href="/agent" className="nav-link" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
          Assistant IA
        </a>
        <a href="/parametres" className="nav-link">⚙ Paramètres</a>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '860px', margin: '0 auto', width: '100%', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '32px 0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>Assistant IA</h1>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>Accès complet à vos données · Actions en temps réel</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
              )}
              <div style={{ maxWidth: '75%' }}>
                <div style={{
                  background: msg.role === 'user' ? '#2563eb' : '#13131a',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: msg.role === 'user' ? 'white' : '#d1d5db',
                }} dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {msg.actions.map((a, j) => (
                      <span key={j} style={{ background: a.success ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: a.success ? '#34d399' : '#f87171', border: `1px solid ${a.success ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>
                        {a.success ? '✓' : '✗'} {a.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
              <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span className="dot" style={{ animationDelay: '0s' }} />
                <span className="dot" style={{ animationDelay: '0.2s' }} />
                <span className="dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (si conversation vide) */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '16px' }}>
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion" onClick={() => { setInput(s); textareaRef.current?.focus() }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ paddingBottom: '24px' }}>
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-end', transition: 'border-color 0.2s' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
            <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
              placeholder="Posez une question ou donnez un ordre à l'IA..."
              style={{ flex: 1, background: 'none', border: 'none', color: '#f1f5f9', fontSize: '14px', lineHeight: '1.5', minHeight: '24px', maxHeight: '120px', fontFamily: 'inherit' }} rows={1} />
            <button onClick={envoyer} disabled={loading || !input.trim()} style={{ width: '36px', height: '36px', borderRadius: '10px', background: input.trim() ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              <svg width="16" height="16" fill="none" stroke={input.trim() ? 'white' : '#475569'} strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#334155', textAlign: 'center', marginTop: '8px' }}>Entrée pour envoyer · Shift+Entrée pour aller à la ligne</p>
        </div>
      </div>
    </div>
  )
}