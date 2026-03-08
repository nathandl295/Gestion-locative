'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const SUGGESTIONS = [
  "Qui est en retard depuis plus de 10 jours ?",
  "Quel est mon taux de recouvrement ?",
  "Envoie une relance à tous les locataires en retard",
  "Combien j'encaisse par mois en tout ?",
  "Qui n'a pas encore payé ce mois-ci ?",
  "Génère un résumé de la situation actuelle",
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 0.2, 0.4].map((d, i) => (
        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', animation: `bounce 1s ease ${d}s infinite` }} />
      ))}
    </div>
  )
}

export default function Agent() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA GestImmo. J\'ai accès à toutes vos données en temps réel. Que puis-je faire pour vous ?', actions: [] }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [nomAgence, setNomAgence] = useState('')
  const bottomRef = useRef()
  const inputRef = useRef()

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

  async function envoyer(texte) {
    const msg = texte || input.trim()
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
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Désolé, une erreur est survenue. Réessayez.', actions: [] }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function formatMessage(text) {
    if (!text) return ''
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>{line.slice(2, -2)}</div>
        if (line.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '3px' }}><span style={{ color: '#3b82f6', flexShrink: 0 }}>·</span><span>{line.slice(2)}</span></div>
        if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
        return <div key={i} style={{ marginBottom: '3px' }}>{line}</div>
      })
  }

  function badgeAction(action) {
    const configs = {
      marquer_paye: { label: '✅ Marqué payé', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
      envoyer_relance: { label: '📧 Relance envoyée', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
      marquer_retard: { label: '⚠️ Marqué en retard', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    }
    const c = configs[action.type] || { label: action.type, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    return (
      <div key={action.nom} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: c.bg, color: c.color, border: `1px solid ${c.color}30`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '500' }}>
        {c.label} — {action.nom}
        {action.success === false && <span style={{ color: '#f87171', fontSize: '11px' }}>(échec{action.reason ? ': ' + action.reason : ''})</span>}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1a1a24; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; font-size:14px; font-weight:500; color:#64748b; text-decoration:none; transition:all 0.2s; }
        .nav-link:hover { background:rgba(255,255,255,0.06); color:#e2e8f0; }
        .suggestion { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:10px 14px; font-size:13px; color:#94a3b8; cursor:pointer; transition:all 0.2s; text-align:left; font-family:inherit; }
        .suggestion:hover { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.25); color:#e2e8f0; transform:translateY(-1px); }
        textarea:focus { outline:none; }
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
        {[
          { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
          { href: '/stats', icon: '∿', label: 'Statistiques' },
          { href: '/historique', icon: '◷', label: 'Historique' },
        ].map(l => (
          <a key={l.href} href={l.href} className="nav-link">{l.icon} {l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#60a5fa' }}>Assistant IA actif</span>
          </div>
          <p style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>Accès temps réel à vos données locataires.</p>
        </div>
      </div>

      {/* Zone chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px', background: '#0f0f13', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Assistant IA GestImmo</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>Propulsé par Claude · Accès données en temps réel</div>
          </div>
          <button onClick={() => setMessages([{ role: 'assistant', content: 'Conversation réinitialisée. Comment puis-je vous aider ?', actions: [] }])}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '7px 14px', color: '#64748b', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
            Nouvelle conversation
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Suggestions si premier message seulement */}
          {messages.length === 1 && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              <p style={{ fontSize: '13px', color: '#334155', marginBottom: '12px', textAlign: 'center' }}>Suggestions</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="suggestion" onClick={() => envoyer(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
              )}
              <div style={{ maxWidth: '75%' }}>
                <div style={{
                  background: msg.role === 'user' ? '#2563eb' : '#13131a',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                }}>
                  {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {msg.actions.map((a, j) => <div key={j}>{badgeAction(a)}</div>)}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>👤</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
              <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 18px 18px 18px', padding: '12px 16px' }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0f0f13', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: '#13131a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 16px', transition: 'border-color 0.2s' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
              placeholder="Posez une question ou demandez une action... (Entrée pour envoyer)"
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', color: '#f1f5f9', fontSize: '14px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px', outline: 'none' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            />
            <button onClick={() => envoyer()} disabled={loading || !input.trim()}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: loading || !input.trim() ? 'rgba(59,130,246,0.3)' : '#2563eb', border: 'none', color: 'white', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', fontSize: '16px' }}>
              →
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#1e293b', textAlign: 'center', marginTop: '8px' }}>Shift+Entrée pour sauter une ligne · L'IA peut effectuer des actions sur vos données</p>
        </div>
      </div>
    </div>
  )
}