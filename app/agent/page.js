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
  const [conversations, setConversations] = useState([])
  const [convActive, setConvActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [nomAgence, setNomAgence] = useState('')
  const [userId, setUserId] = useState(null)
  const [editTitre, setEditTitre] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) setNomAgence(agence.nom)
      await chargerConversations(session.user.id)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function chargerConversations(uid) {
    setLoadingConvs(true)
    const { data } = await supabase.from('conversations')
      .select('*').eq('user_id', uid).order('updated_at', { ascending: false })
    setConversations(data || [])
    if (data && data.length > 0) {
      ouvrirConversation(data[0])
    } else {
      await nouvelleConversation(uid)
    }
    setLoadingConvs(false)
  }

  function ouvrirConversation(conv) {
    setConvActive(conv)
    setMessages(conv.messages && conv.messages.length > 0 ? conv.messages : [
      { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider ?' }
    ])
  }

  async function nouvelleConversation(uid) {
    const id = uid || userId
    const msgInit = [{ role: 'assistant', content: 'Bonjour ! Je suis votre assistant GestImmo. Je peux consulter vos données en temps réel, envoyer des relances, modifier des informations. Comment puis-je vous aider ?' }]
    const { data } = await supabase.from('conversations').insert([{
      user_id: id,
      titre: 'Nouvelle conversation',
      messages: msgInit,
    }]).select().single()
    if (data) {
      setConversations(c => [data, ...c])
      setConvActive(data)
      setMessages(msgInit)
    }
  }

  async function envoyer() {
    if (!input.trim() || loading || !convActive) return
    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      })
      const data = await res.json()
      const assistantMsg = { role: 'assistant', content: data.reply, actions: data.actions }
      const finalMessages = [...newMessages, assistantMsg]
      setMessages(finalMessages)

      let titre = convActive.titre
      if (messages.filter(m => m.role === 'user').length === 0) {
        titre = userMsg.length > 40 ? userMsg.substring(0, 40) + '...' : userMsg
      }

      await supabase.from('conversations').update({
        messages: finalMessages,
        titre,
        updated_at: new Date().toISOString()
      }).eq('id', convActive.id)

      setConvActive(c => ({ ...c, messages: finalMessages, titre }))
      setConversations(cs => cs.map(c => c.id === convActive.id ? { ...c, messages: finalMessages, titre } : c))
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Désolé, une erreur s'est produite." }])
    }
    setLoading(false)
  }

  async function supprimerConversation(id) {
    await supabase.from('conversations').delete().eq('id', id)
    const restantes = conversations.filter(c => c.id !== id)
    setConversations(restantes)
    if (convActive?.id === id) {
      if (restantes.length > 0) ouvrirConversation(restantes[0])
      else await nouvelleConversation()
    }
  }

  async function renommerConversation(id, titre) {
    await supabase.from('conversations').update({ titre }).eq('id', id)
    setConversations(cs => cs.map(c => c.id === id ? { ...c, titre } : c))
    if (convActive?.id === id) setConvActive(c => ({ ...c, titre }))
    setEditTitre(null)
  }

  const suggestions = [
    'Qui est en retard ce mois ?',
    'Envoie une relance à tous les locataires en retard',
    'Quel est mon taux de recouvrement ?',
    'Contrats expirants bientôt ?',
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; color: #64748b; text-decoration: none; transition: all 0.2s; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .conv-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
        .conv-item:hover { background: rgba(255,255,255,0.05); }
        .conv-item.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.2); }
        .del-btn { opacity: 0; background: none; border: none; color: #475569; cursor: pointer; padding: 2px 5px; border-radius: 5px; transition: all 0.15s; font-size: 14px; flex-shrink: 0; }
        .conv-item:hover .del-btn { opacity: 1; }
        .del-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); }
        @keyframes dots { 0%,80%,100%{opacity:0;transform:scale(0)} 40%{opacity:1;transform:scale(1)} }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #475569; display: inline-block; animation: dots 1.2s infinite; }
        textarea { font-family: inherit; resize: none; }
        textarea:focus { outline: none; }
        .suggestion { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 7px 14px; font-size: 12px; color: #64748b; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
        .suggestion:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
      `}</style>

      {/* Sidebar nav */}
      <div style={{ width: '190px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '14px', textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</div>
            {nomAgence && <div style={{ fontSize: '10px', color: '#475569' }}>{nomAgence}</div>}
          </div>
        </a>
        {[{href:'/dashboard',label:'Dashboard'},{href:'/stats',label:'Statistiques'},{href:'/historique',label:'Historique'}].map(l => (
          <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href="/agent" className="nav-link" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
          🤖 Assistant IA
        </a>
        <a href="/parametres" className="nav-link">⚙ Paramètres</a>
      </div>

      {/* Sidebar conversations */}
      <div style={{ width: '220px', flexShrink: 0, background: '#0f0f13', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => nouvelleConversation()} style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', padding: '9px 12px', color: '#a5b4fc', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit', justifyContent: 'center' }}>
            + Nouvelle conversation
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loadingConvs ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#334155', fontSize: '13px' }}>Chargement...</div>
          ) : conversations.map(conv => (
            <div key={conv.id} className={`conv-item ${convActive?.id === conv.id ? 'active' : ''}`} onClick={() => ouvrirConversation(conv)}>
              {editTitre === conv.id ? (
                <input autoFocus defaultValue={conv.titre}
                  style={{ flex: 1, background: 'none', border: 'none', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
                  onBlur={e => renommerConversation(conv.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renommerConversation(conv.id, e.target.value) }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span onDoubleClick={e => { e.stopPropagation(); setEditTitre(conv.id) }}
                  style={{ flex: 1, fontSize: '13px', color: convActive?.id === conv.id ? '#c4b5fd' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                  💬 {conv.titre}
                </span>
              )}
              <button className="del-btn" onClick={e => { e.stopPropagation(); supprimerConversation(conv.id) }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#334155' }}>
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Chat zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>{convActive?.titre || 'Assistant IA'}</div>
            <div style={{ fontSize: '11px', color: '#475569' }}>Accès temps réel · Actions directes · Sauvegardé</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '3px' }}>🤖</div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  background: msg.role === 'user' ? '#2563eb' : '#13131a',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  padding: '10px 14px', fontSize: '14px', lineHeight: '1.6',
                  color: msg.role === 'user' ? 'white' : '#d1d5db',
                }} dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {msg.actions.map((a, j) => (
                      <span key={j} style={{ background: a.success ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', color: a.success ? '#34d399' : '#f87171', border: `1px solid ${a.success ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: '600' }}>
                        {a.success ? '✓' : '✗'} {a.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🤖</div>
              <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span className="dot" style={{ animationDelay: '0s' }} />
                <span className="dot" style={{ animationDelay: '0.2s' }} />
                <span className="dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 28px 12px' }}>
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion" onClick={() => { setInput(s); textareaRef.current?.focus() }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '0 28px 20px', flexShrink: 0 }}>
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
              placeholder="Posez une question ou donnez un ordre..."
              style={{ flex: 1, background: 'none', border: 'none', color: '#f1f5f9', fontSize: '14px', lineHeight: '1.5', minHeight: '24px', maxHeight: '120px', fontFamily: 'inherit' }} rows={1} />
            <button onClick={envoyer} disabled={loading || !input.trim()} style={{ width: '34px', height: '34px', borderRadius: '9px', background: input.trim() ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              <svg width="15" height="15" fill="none" stroke={input.trim() ? 'white' : '#475569'} strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#2d3748', textAlign: 'center', marginTop: '6px' }}>Entrée pour envoyer · Shift+Entrée nouvelle ligne · Double-clic sur titre pour renommer</p>
        </div>
      </div>
    </div>
  )
}