'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { supabase } from '../../../supabase'
import { useToast } from '../../../toast'

export default function ModifierLocataire({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', appartement: '',
    loyer_montant: '', loyer_echeance: '', statut: 'en_attente',
    notes: '', contrat_debut: '', contrat_fin: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('locataires').select('*').eq('id', params.id).single()
      if (data) setForm({
        nom: data.nom || '', email: data.email || '', telephone: data.telephone || '',
        appartement: data.appartement || '', loyer_montant: data.loyer_montant || '',
        loyer_echeance: data.loyer_echeance || '', statut: data.statut || 'en_attente',
        notes: data.notes || '', contrat_debut: data.contrat_debut || '', contrat_fin: data.contrat_fin || ''
      })
      setLoading(false)
    }
    init()
  }, [params.id])

  async function sauvegarder(e) {
    e.preventDefault()
    if (!form.nom || !form.appartement || !form.loyer_montant) {
      toast('Nom, appartement et loyer sont obligatoires', 'error'); return
    }
    setSaving(true)
    const { error } = await supabase.from('locataires').update(form).eq('id', params.id)
    if (error) { toast('Erreur : ' + error.message, 'error'); setSaving(false); return }
    toast('Modifications sauvegardées', 'success')
    router.push('/locataires/' + params.id)
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '11px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }
  const cardStyle = { background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }
  const focusOn = e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'
  const focusOff = e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse 0.9s ease ${d}s infinite` }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } input,select,textarea { font-family: inherit; }`}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        {[{href:'/dashboard',label:'Dashboard'},{href:'/stats',label:'Statistiques'},{href:'/historique',label:'Historique'}].map(l => (
          <a key={l.href} href={l.href} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#64748b', textDecoration: 'none', display: 'block' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#64748b' }}>{l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href={'/locataires/' + params.id} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#94a3b8', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', display: 'block' }}>← Retour au profil</a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '40px', maxWidth: '700px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Modifier le locataire</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{form.nom} · {form.appartement}</p>
        </div>

        <form onSubmit={sauvegarder}>
          {/* Infos personnelles */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informations personnelles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nom complet *</label>
                <input style={inputStyle} value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} onFocus={focusOn} onBlur={focusOff} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input style={inputStyle} value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
          </div>

          {/* Loyer */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loyer</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Appartement *</label>
                <input style={inputStyle} value={form.appartement} onChange={e => setForm({...form, appartement: e.target.value})} onFocus={focusOn} onBlur={focusOff} required />
              </div>
              <div>
                <label style={labelStyle}>Montant (€) *</label>
                <input type="number" style={inputStyle} value={form.loyer_montant} onChange={e => setForm({...form, loyer_montant: e.target.value})} onFocus={focusOn} onBlur={focusOff} required />
              </div>
              <div>
                <label style={labelStyle}>Échéance (jour)</label>
                <input type="number" min="1" max="31" style={inputStyle} value={form.loyer_echeance} onChange={e => setForm({...form, loyer_echeance: e.target.value})} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}>
                  <option value="en_attente">En attente</option>
                  <option value="paye">Payé</option>
                  <option value="en_retard">En retard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contrat */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contrat de bail</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Date de début</label>
                <input type="date" style={inputStyle} value={form.contrat_debut} onChange={e => setForm({...form, contrat_debut: e.target.value})} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input type="date" style={inputStyle} value={form.contrat_fin} onChange={e => setForm({...form, contrat_fin: e.target.value})} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes internes</h2>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: 1.6 }} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} onFocus={focusOn} onBlur={focusOff} placeholder="Notes visibles uniquement par vous..." />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <a href={'/locataires/' + params.id} style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', textDecoration: 'none' }}>Annuler</a>
            <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}