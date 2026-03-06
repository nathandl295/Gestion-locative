'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const ROLES = {
  admin: { label: 'Admin', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', desc: 'Accès complet + gestion des membres' },
  gestionnaire: { label: 'Gestionnaire', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', desc: 'Modifier locataires, envoyer relances' },
  lecteur: { label: 'Lecteur', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', desc: 'Lecture seule, aucune modification' },
}

function getRole(role) {
  return ROLES[role] || ROLES['lecteur']
}

export default function Membres() {
  const router = useRouter()
  const [membres, setMembres] = useState([])
  const [monRole, setMonRole] = useState('lecteur')
  const [agenceId, setAgenceId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('gestionnaire')
  const [inviting, setInviting] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const { data: agence } = await supabase.from('agence').select('*').single()
        if (!agence) { router.push('/dashboard'); return }
        setAgenceId(agence.id)

        const { data: membre } = await supabase.from('membres')
          .select('*').eq('user_id', session.user.id).eq('agence_id', agence.id).single()

        if (!membre) {
          await supabase.from('membres').upsert({
            agence_id: agence.id,
            user_id: session.user.id,
            email: session.user.email,
            role: 'admin',
            invite_accepte: true
          }, { onConflict: 'user_id,agence_id' })
          setMonRole('admin')
        } else {
          setMonRole(membre.role || 'lecteur')
          if (!membre.invite_accepte) {
            await supabase.from('membres').update({ invite_accepte: true }).eq('id', membre.id)
          }
        }

        const { data: tousMembres } = await supabase.from('membres')
          .select('*').eq('agence_id', agence.id).order('created_at')
        setMembres(tousMembres || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function inviterMembre() {
    if (!inviteEmail.trim()) { showToast('Entrez un email', 'error'); return }
    if (monRole !== 'admin') { showToast('Seul l\'admin peut inviter', 'error'); return }
    setInviting(true)
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const { error } = await supabase.from('membres').insert({
      agence_id: agenceId, email: inviteEmail.trim(), role: inviteRole,
      invite_token: token, invite_accepte: false
    })
    if (error) { showToast('Erreur : ' + error.message, 'error'); setInviting(false); return }
    const lien = `${window.location.origin}/invitation?token=${token}`
    await fetch('/api/invitation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, lien, role: inviteRole })
    })
    const { data: tousMembres } = await supabase.from('membres').select('*').eq('agence_id', agenceId).order('created_at')
    setMembres(tousMembres || [])
    setInviteEmail('')
    setInviting(false)
    showToast('Invitation envoyée à ' + inviteEmail)
  }

  async function changerRole(membreId, nouveauRole) {
    if (monRole !== 'admin') { showToast('Seul l\'admin peut modifier les rôles', 'error'); return }
    await supabase.from('membres').update({ role: nouveauRole }).eq('id', membreId)
    setMembres(membres.map(m => m.id === membreId ? { ...m, role: nouveauRole } : m))
    showToast('Rôle modifié')
  }

  async function supprimerMembre(membreId, email) {
    if (monRole !== 'admin') { showToast('Seul l\'admin peut supprimer', 'error'); return }
    if (!confirm(`Supprimer ${email} de l'équipe ?`)) return
    await supabase.from('membres').delete().eq('id', membreId)
    setMembres(membres.filter(m => m.id !== membreId))
    showToast(email + ' retiré')
  }

  const cardStyle = { background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '11px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pulse { 0%,100%{transform:scaleY(0.5);opacity:0.5} 50%{transform:scaleY(1);opacity:1} }`}</style>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse 0.9s ease ${d}s infinite` }} />)}
      </div>
    </div>
  )

  const roleInfo = getRole(monRole)

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input,select { font-family: inherit; }
        input:focus,select:focus { border-color: rgba(59,130,246,0.5) !important; outline: none; }
        select option { background: #1a1a24; }
        .nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; font-size:14px; font-weight:500; color:#64748b; text-decoration:none; transition:all 0.2s; }
        .nav-link:hover { background:rgba(255,255,255,0.06); color:#e2e8f0; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'error' ? '#f87171' : '#34d399', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', zIndex: 999, fontFamily: "'DM Sans', system-ui" }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        <a href="/dashboard" className="nav-link">Dashboard</a>
        <a href="/stats" className="nav-link">Statistiques</a>
        <a href="/historique" className="nav-link">Historique</a>
        <div style={{ flex: 1 }} />
        <a href="/membres" className="nav-link" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>👥 Équipe</a>
        <a href="/parametres" className="nav-link">⚙ Paramètres</a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '40px', maxWidth: '720px' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Équipe</h1>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Gérez les accès à votre espace GestImmo.</p>
          </div>
          <span style={{ background: roleInfo.bg, border: `1px solid ${roleInfo.color}30`, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: roleInfo.color }}>
            Vous : {roleInfo.label}
          </span>
        </div>

        {/* Membres */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {membres.length} membre{membres.length > 1 ? 's' : ''}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {membres.map(m => {
              const r = getRole(m.role)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: r.color, flexShrink: 0 }}>
                    {(m.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{m.invite_accepte ? 'Actif' : '⏳ Invitation en attente'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {monRole === 'admin' ? (
                      <select value={m.role || 'lecteur'} onChange={e => changerRole(m.id, e.target.value)}
                        style={{ background: r.bg, border: `1px solid ${r.color}30`, borderRadius: '8px', padding: '5px 10px', color: r.color, fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                        {Object.entries(ROLES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ background: r.bg, color: r.color, borderRadius: '8px', padding: '5px 10px', fontSize: '12px', fontWeight: '600' }}>{r.label}</span>
                    )}
                    {monRole === 'admin' && (
                      <button onClick={() => supprimerMembre(m.id, m.email)}
                        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {membres.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#334155', fontSize: '14px' }}>Aucun membre pour l'instant</div>
            )}
          </div>
        </div>

        {/* Inviter */}
        {monRole === 'admin' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inviter un membre</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                <input style={inputStyle} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborateur@email.com"
                  onKeyDown={e => e.key === 'Enter' && inviterMembre()} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rôle</label>
                <select style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="gestionnaire">Gestionnaire</option>
                  <option value="lecteur">Lecteur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={inviterMembre} disabled={inviting}
                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: inviting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: inviting ? 0.7 : 1, fontFamily: 'inherit' }}>
                {inviting ? 'Envoi...' : '+ Inviter'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
              {Object.entries(ROLES).map(([key, val]) => (
                <div key={key} style={{ background: val.bg, border: `1px solid ${val.color}20`, borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: val.color, marginBottom: '4px' }}>{val.label}</div>
                  <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>{val.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {monRole !== 'admin' && (
          <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: '600', marginBottom: '6px' }}>💡 Votre rôle : {roleInfo.label}</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>{roleInfo.desc}. Contactez votre admin pour modifier vos droits.</div>
          </div>
        )}
      </div>
    </div>
  )
}