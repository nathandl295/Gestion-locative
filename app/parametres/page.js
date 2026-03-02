'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect.'); setLoading(false) }
    else router.push('/dashboard')
  }

  const features = [
    { icon: '📊', text: 'Suivi des loyers en temps reel' },
    { icon: '📧', text: 'Relances automatiques par email' },
    { icon: '📄', text: 'Generation de quittances PDF' },
    { icon: '📅', text: 'Historique des paiements' },
    { icon: '⚠️', text: 'Alertes contrats expirants' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f0f13', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input { font-family: inherit; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Panneau gauche */}
      <div style={{ width: '480px', flexShrink: 0, background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.06)' }} className="hidden-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="32" height="32" viewBox="0 0 60 60">
            <rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/>
            <rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/>
            <rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/>
          </svg>
          <span style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>GestImmo</span>
        </div>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#f1f5f9', lineHeight: 1.2, letterSpacing: '-1px', marginBottom: '16px' }}>Gestion locative<br /><span style={{ color: '#3b82f6' }}>simplifiee.</span></h1>
          <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '40px', lineHeight: 1.6 }}>Suivez vos loyers, relancez vos locataires et generez vos quittances en quelques clics.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{f.icon}</div>
                <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ color: '#334155', fontSize: '12px' }}>© 2025 GestImmo — Tous droits reserves</p>
      </div>

      {/* Panneau droit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Connexion</h2>
            <p style={{ color: '#475569', fontSize: '14px', marginTop: '6px' }}>Entrez vos identifiants pour acceder a votre espace.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.02em' }}>Adresse email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#94a3b8', marginBottom: '8px' }}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 48px 12px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#475569' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#f87171', fontSize: '13px' }}>⚠ {error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#1d4ed8' }}
              onMouseLeave={e => e.target.style.background = '#2563eb'}
            >
              {loading ? (
                <><svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg> Connexion...</>
              ) : 'Se connecter'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#334155', marginTop: '24px' }}>Acces reserve aux gestionnaires autorises.</p>
        </div>
      </div>
    </div>
  )
}