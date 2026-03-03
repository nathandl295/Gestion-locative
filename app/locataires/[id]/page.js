'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'
import { useToast } from '../../toast'

function joursDepuis(dateStr) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'il y a 1 jour'
  return `il y a ${diff} jours`
}

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  return Math.floor((Date.now() - new Date(dateRetard).getTime()) / (1000 * 60 * 60 * 24))
}

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function LocatairePage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const { toast } = useToast()
  const [locataire, setLocataire] = useState(null)
  const [relances, setRelances] = useState([])
  const [historiquePaiements, setHistoriquePaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('profil')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: loc } = await supabase.from('locataires').select('*').eq('id', params.id).single()
      if (!loc) { router.push('/dashboard'); return }
      setLocataire(loc)
      // Relances depuis la table relances (automatiques + manuelles)
      const { data: rel } = await supabase.from('relances').select('*')
        .eq('locataire_id', params.id)
        .order('envoye_le', { ascending: false })
      setRelances(rel || [])
      const annee = new Date().getFullYear()
      const { data: hist } = await supabase.from('historique_paiements').select('*')
        .eq('locataire_id', params.id).eq('annee', annee)
      setHistoriquePaiements(hist || [])
      setLoading(false)
    }
    init()
  }, [params.id])

  async function supprimerLocataire() {
    if (!confirm(`Supprimer définitivement ${locataire.nom} ?`)) return
    await supabase.from('relances').delete().eq('locataire_id', params.id)
    await supabase.from('locataires').delete().eq('id', params.id)
    toast('Locataire supprimé', 'success')
    router.push('/dashboard')
  }

  const cardStyle = { background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }
  const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0,0.15,0.3].map((d,i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse 0.9s ease ${d}s infinite` }}/>)}
      </div>
    </div>
  )

  const jours = joursEnRetard(locataire.date_retard)
  const statutColor = locataire.statut === 'paye' ? '#34d399' : locataire.statut === 'en_retard' ? '#f87171' : '#fb923c'
  const statutLabel = locataire.statut === 'paye' ? 'Payé' : locataire.statut === 'en_retard' ? `En retard · ${jours}j` : 'En attente'

  // Grille paiements 12 mois
  const moisActuel = new Date().getMonth()
  const grilleMois = MOIS.map((m, i) => {
    const h = historiquePaiements.find(p => p.mois === i + 1)
    return { mois: m, index: i, statut: h?.statut || null, actuel: i === moisActuel }
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{transform:scaleY(0.5);opacity:0.5} 50%{transform:scaleY(1);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nav-link { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; font-size:14px; font-weight:500; color:#64748b; text-decoration:none; transition:all 0.2s; }
        .nav-link:hover { background:rgba(255,255,255,0.06); color:#e2e8f0; }
        .tab-btn { padding:9px 18px; border-radius:10px; font-size:13px; font-weight:500; border:none; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .tab-btn.active { background:#2563eb; color:white; }
        .tab-btn.inactive { background:rgba(255,255,255,0.04); color:#64748b; }
        .tab-btn.inactive:hover { background:rgba(255,255,255,0.08); color:#94a3b8; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        {[{href:'/dashboard',label:'Dashboard'},{href:'/stats',label:'Statistiques'},{href:'/historique',label:'Historique'}].map(l => (
          <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href="/dashboard" className="nav-link" style={{ background: 'rgba(255,255,255,0.04)' }}>← Retour dashboard</a>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        <div style={{ maxWidth: '760px', animation: 'fadeIn 0.4s ease' }}>

          {/* Header profil */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${statutColor}18`, border: `2px solid ${statutColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: statutColor }}>
                {locataire.nom.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{locataire.nom}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{locataire.appartement}</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#334155', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', fontFamily: 'DM Mono' }}>{locataire.loyer_montant}€/mois</span>
                  <span style={{ background: `${statutColor}15`, color: statutColor, border: `1px solid ${statutColor}30`, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: '600' }}>{statutLabel}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href={`/locataires/${params.id}/modifier`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)' }}>
                ✏️ Modifier
              </a>
              <button onClick={supprimerLocataire} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)', cursor: 'pointer' }}>
                🗑 Supprimer
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[{id:'profil',label:'👤 Profil'},{id:'relances',label:`📧 Relances (${relances.length})`},{id:'paiements',label:'📅 Paiements'}].map(o => (
              <button key={o.id} className={`tab-btn ${onglet === o.id ? 'active' : 'inactive'}`} onClick={() => setOnglet(o.id)}>{o.label}</button>
            ))}
          </div>

          {/* ===== ONGLET PROFIL ===== */}
          {onglet === 'profil' && (
            <div>
              {/* Infos */}
              <div style={cardStyle}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Informations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Email', value: locataire.email || '—' },
                    { label: 'Téléphone', value: locataire.telephone || '—' },
                    { label: 'Échéance', value: locataire.loyer_echeance ? `Le ${locataire.loyer_echeance} du mois` : '—' },
                    { label: 'Début contrat', value: locataire.contrat_debut ? new Date(locataire.contrat_debut).toLocaleDateString('fr-FR') : '—' },
                    { label: 'Fin contrat', value: locataire.contrat_fin ? new Date(locataire.contrat_fin).toLocaleDateString('fr-FR') : '—' },
                    { label: 'Dernière relance', value: locataire.derniere_relance ? joursDepuis(locataire.derniere_relance) : '—' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={labelStyle}>{item.label}</div>
                      <div style={{ fontSize: '14px', color: '#e2e8f0', marginTop: '4px', fontWeight: '500' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {locataire.notes && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    <div style={labelStyle}>Notes internes</div>
                    <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.6 }}>{locataire.notes}</p>
                  </div>
                )}
              </div>

              {/* Résumé financier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Loyer mensuel', value: locataire.loyer_montant + '€', color: '#a78bfa' },
                  { label: 'Loyer annuel', value: (parseFloat(locataire.loyer_montant) * 12).toLocaleString('fr-FR') + '€', color: '#60a5fa' },
                  { label: 'Relances envoyées', value: relances.length, color: relances.length > 3 ? '#f87171' : '#34d399' },
                ].map((item, i) => (
                  <div key={i} style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px' }}>
                    <div style={labelStyle}>{item.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: item.color, marginTop: '6px', fontFamily: 'DM Mono' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== ONGLET RELANCES ===== */}
          {onglet === 'relances' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>
                Historique des relances envoyées
              </div>
              {relances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                  <p style={{ fontSize: '14px' }}>Aucune relance envoyée pour ce locataire.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {relances.map((r, i) => {
                    const date = r.envoye_le || r.created_at
                    const depuis = joursDepuis(date)
                    const dateFormatee = new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    const heureFormatee = new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    const isRecent = i === 0
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', background: isRecent ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isRecent ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                          📧
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{r.template_nom || 'Relance'}</span>
                            {isRecent && <span style={{ fontSize: '10px', fontWeight: '700', color: '#60a5fa', background: 'rgba(96,165,250,0.12)', borderRadius: '20px', padding: '2px 8px' }}>DERNIÈRE</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{dateFormatee} à {heureFormatee}</span>
                            <span style={{ fontSize: '11px', color: '#334155' }}>·</span>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#60a5fa' }}>{depuis}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#34d399', background: 'rgba(52,211,153,0.1)', borderRadius: '20px', padding: '3px 10px', flexShrink: 0 }}>Envoyée ✓</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== ONGLET PAIEMENTS ===== */}
          {onglet === 'paiements' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>
                Suivi paiements {new Date().getFullYear()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {grilleMois.map(m => {
                  const color = m.statut === 'paye' ? '#34d399' : m.statut === 'impaye' ? '#f87171' : '#334155'
                  const bg = m.statut === 'paye' ? 'rgba(52,211,153,0.1)' : m.statut === 'impaye' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)'
                  return (
                    <div key={m.index} style={{ background: bg, border: `1px solid ${m.actuel ? color : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', padding: '12px 8px', textAlign: 'center', outline: m.actuel ? `2px solid ${color}40` : 'none', outlineOffset: '2px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>{m.mois}</div>
                      <div style={{ fontSize: '18px' }}>
                        {m.statut === 'paye' ? '✓' : m.statut === 'impaye' ? '✗' : '·'}
                      </div>
                      <div style={{ fontSize: '10px', color, marginTop: '4px', fontWeight: '500' }}>
                        {m.statut === 'paye' ? 'Payé' : m.statut === 'impaye' ? 'Impayé' : m.actuel ? 'En cours' : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
                {[{label:'Payé',color:'#34d399'},{label:'Impayé',color:'#f87171'},{label:'Non renseigné',color:'#334155'}].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: '12px', color: '#475569' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}