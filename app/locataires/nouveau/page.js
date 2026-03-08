'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'
import { useToast } from '../../toast'

const SIDEBAR_LINKS = [
  { href: '/dashboard', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: 'Dashboard' },
  { href: '/stats', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: 'Statistiques' },
  { href: '/historique', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: 'Historique' },
]

export default function NouveauLocataire() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', appartement: '', loyer_montant: '', loyer_echeance: '', statut: 'en_attente' })

  async function sauvegarder(e) {
    e.preventDefault()
    if (!form.nom || !form.appartement || !form.loyer_montant) { toast('Nom, appartement et loyer sont obligatoires', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('locataires').insert([form])
    if (error) { toast('Erreur : ' + error.message, 'error'); setSaving(false); return }
    toast(form.nom + ' ajoute avec succes', 'success')
    router.push('/dashboard')
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '11px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } input,select,textarea { font-family: inherit; } input:focus,select:focus,textarea:focus { border-color: rgba(59,130,246,0.5) !important; outline: none; }`}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        {SIDEBAR_LINKS.map(l => (
          <a key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#64748b', textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b' }}>
            {l.icon}{l.label}
          </a>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '40px', maxWidth: '700px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Nouveau locataire</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Remplissez les informations du nouveau locataire.</p>
        </div>

        <form onSubmit={sauvegarder} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Infos personnelles */}
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informations personnelles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nom complet <span style={{ color: '#f87171' }}>*</span></label>
                <input style={inputStyle} value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Sophie Bernard" required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sophie@email.com" />
              </div>
              <div>
                <label style={labelStyle}>Telephone</label>
                <input style={inputStyle} value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} placeholder="06 12 34 56 78" />
              </div>
            </div>
          </div>

          {/* Loyer */}
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loyer</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Appartement <span style={{ color: '#f87171' }}>*</span></label>
                <input style={inputStyle} value={form.appartement} onChange={e => setForm({...form, appartement: e.target.value})} placeholder="Appt 3A - 12 rue des Fleurs" required />
              </div>
              <div>
                <label style={labelStyle}>Montant (€) <span style={{ color: '#f87171' }}>*</span></label>
                <input type="number" style={inputStyle} value={form.loyer_montant} onChange={e => setForm({...form, loyer_montant: e.target.value})} placeholder="750" required />
              </div>
              <div>
                <label style={labelStyle}>Echeance (jour du mois)</label>
                <input type="number" min="1" max="31" style={inputStyle} value={form.loyer_echeance} onChange={e => setForm({...form, loyer_echeance: e.target.value})} placeholder="5" />
              </div>
              <div>
                <label style={labelStyle}>Statut initial</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                  <option value="en_attente">En attente</option>
                  <option value="paye">Paye</option>
                  <option value="en_retard">En retard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', textDecoration: 'none', transition: 'all 0.2s' }}>
              Annuler
            </a>
            <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: saving ? '#1d4ed8' : '#2563eb', color: 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
              {saving ? 'Ajout en cours...' : '+ Ajouter le locataire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}