'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  return Math.floor((new Date() - new Date(dateRetard)) / 86400000)
}

export default function Stats() {
  const router = useRouter()
  const [locataires, setLocataires] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: locs } = await supabase.from('locataires').select('*')
      setLocataires(locs || [])
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) setNomAgence(agence.nom)
      setLoading(false)
      setTimeout(() => setMounted(true), 50)
    }
    init()
  }, [])

  const total = locataires.length
  const enRetard = locataires.filter(l => l.statut === 'en_retard')
  const payes = locataires.filter(l => l.statut === 'paye')
  const enAttente = locataires.filter(l => l.statut === 'en_attente')
  const totalLoyers = locataires.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const loyersEncaisses = payes.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const loyersEnRetard = enRetard.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const tauxRecouvrement = total > 0 ? Math.round((payes.length / total) * 100) : 0

  const top5Retard = [...enRetard].sort((a, b) => joursEnRetard(b.date_retard) - joursEnRetard(a.date_retard)).slice(0, 5)

  // Répartition loyers par tranche
  const tranches = [
    { label: '< 500€', min: 0, max: 500, color: '#60a5fa' },
    { label: '500–800€', min: 500, max: 800, color: '#34d399' },
    { label: '800–1200€', min: 800, max: 1200, color: '#a78bfa' },
    { label: '> 1200€', min: 1200, max: Infinity, color: '#fb923c' },
  ]
  const tranchesData = tranches.map(t => ({
    ...t,
    count: locataires.filter(l => l.loyer_montant >= t.min && l.loyer_montant < t.max).length,
    total: locataires.filter(l => l.loyer_montant >= t.min && l.loyer_montant < t.max).reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  }))
  const maxTranche = Math.max(...tranchesData.map(t => t.count), 1)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 0.15, 0.3].map((d, i) => (
          <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse-bar 0.9s ease-in-out ${d}s infinite` }} />
        ))}
      </div>
    </div>
  )

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1a1a24; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .card { background: #13131a; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #94a3b8; text-decoration: none; transition: all 0.2s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .nav-link.active { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .kpi { background: #13131a; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 22px 24px; }
        .bar-track { background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; height: 8px; }
        .row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .row:last-child { border-bottom: none; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar — identique au dashboard */}
        <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 60 60">
              <rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/>
              <rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/>
              <rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/>
            </svg>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>GestImmo</div>
              {nomAgence && <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{nomAgence}</div>}
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '0.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Navigation</div>
          <a href="/dashboard" className="nav-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </a>
          <a href="/stats" className="nav-link active">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Statistiques
          </a>
          <a href="/historique" className="nav-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historique
          </a>
          <a href="/locataires/nouveau" className="nav-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouveau locataire
          </a>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '0.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Parametres</div>
          <a href="/parametres" className="nav-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Parametres
          </a>
          <a href="/import" className="nav-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importer CSV
          </a>
        </div>

        {/* Contenu principal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', ...fadeIn(0.1) }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Statistiques</h1>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>Vue d'ensemble de votre portefeuille</p>
            </div>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 16px', color: '#94a3b8', fontSize: '13px', textDecoration: 'none', transition: 'all 0.2s' }}>
              ← Retour
            </a>
          </div>

          {/* KPIs principaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px', ...fadeIn(0.15) }}>
            {[
              { label: 'Loyers / mois', value: totalLoyers.toLocaleString('fr-FR') + ' €', sub: 'Potentiel total', color: '#60a5fa', icon: '💰' },
              { label: 'Encaisses ce mois', value: loyersEncaisses.toLocaleString('fr-FR') + ' €', sub: payes.length + ' locataires', color: '#34d399', icon: '✅' },
              { label: 'En attente', value: loyersEnRetard.toLocaleString('fr-FR') + ' €', sub: enRetard.length + ' en retard · ' + enAttente.length + ' en attente', color: '#f87171', icon: '⚠️' },
              { label: 'Taux de recouvrement', value: tauxRecouvrement + '%', sub: payes.length + ' / ' + total + ' locataires', color: tauxRecouvrement >= 80 ? '#34d399' : tauxRecouvrement >= 50 ? '#fb923c' : '#f87171', icon: '📊' },
            ].map((k, i) => (
              <div key={i} className="kpi" style={{ ...fadeIn(0.15 + i * 0.05) }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '20px' }}>{k.icon}</span>
                  <span style={{ fontSize: '11px', color: '#334155', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-1px', marginBottom: '6px' }}>{k.value}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Barre de progression recouvrement */}
          <div className="card" style={{ marginBottom: '24px', ...fadeIn(0.3) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>Recouvrement du mois</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Repartition des {total} locataires</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: tauxRecouvrement >= 80 ? '#34d399' : '#fb923c', fontFamily: "'DM Mono', monospace" }}>{tauxRecouvrement}%</div>
            </div>
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', gap: '2px' }}>
              {payes.length > 0 && <div style={{ flex: payes.length, background: '#34d399', transition: 'flex 0.8s ease', borderRadius: '4px' }} title={`Payes: ${payes.length}`} />}
              {enAttente.length > 0 && <div style={{ flex: enAttente.length, background: '#fb923c', transition: 'flex 0.8s ease', borderRadius: '4px' }} title={`En attente: ${enAttente.length}`} />}
              {enRetard.length > 0 && <div style={{ flex: enRetard.length, background: '#f87171', transition: 'flex 0.8s ease', borderRadius: '4px' }} title={`En retard: ${enRetard.length}`} />}
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
              {[
                { label: 'Payes', count: payes.length, color: '#34d399' },
                { label: 'En attente', count: enAttente.length, color: '#fb923c' },
                { label: 'En retard', count: enRetard.length, color: '#f87171' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color }} />
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{s.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2 colonnes : top retards + répartition loyers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Top 5 retards */}
            <div className="card" style={{ ...fadeIn(0.35) }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>Top retards</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Locataires avec le plus de jours de retard</div>
              </div>
              {top5Retard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#334155' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '13px' }}>Aucun retard en cours</div>
                </div>
              ) : top5Retard.map((l, i) => {
                const j = joursEnRetard(l.date_retard)
                const maxJ = joursEnRetard(top5Retard[0]?.date_retard) || 1
                const pct = Math.round((j / maxJ) * 100)
                const color = j >= 20 ? '#f87171' : j >= 10 ? '#fb923c' : '#fbbf24'
                return (
                  <div key={l.id} className="row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#f87171', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</div>
                        <div style={{ marginTop: '4px' }}>
                          <div className="bar-track" style={{ width: '120px' }}>
                            <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: "'DM Mono', monospace" }}>{j}j</span>
                      <span style={{ fontSize: '11px', color: '#475569' }}>{l.loyer_montant}€</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Répartition par tranche */}
            <div className="card" style={{ ...fadeIn(0.4) }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>Repartition des loyers</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Distribution par tranche de montant</div>
              </div>
              {tranchesData.map((t, i) => (
                <div key={i} className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: t.color, fontFamily: "'DM Mono', monospace" }}>{t.count}</span>
                    </div>
                    <div className="bar-track">
                      <div style={{ height: '100%', width: Math.round((t.count / maxTranche) * 100) + '%', background: t.color, borderRadius: '4px', transition: 'width 0.8s ease ' + (i * 0.1) + 's' }} />
                    </div>
                    {t.count > 0 && <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>{t.total.toLocaleString('fr-FR')}€ / mois</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Résumé financier */}
          <div className="card" style={{ ...fadeIn(0.45) }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>Synthese financiere</div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>Apercu global du portefeuille</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { label: 'Loyer moyen', value: total > 0 ? Math.round(totalLoyers / total).toLocaleString('fr-FR') + ' €' : '-', color: '#60a5fa' },
                { label: 'Loyer minimum', value: total > 0 ? Math.min(...locataires.map(l => l.loyer_montant || 0)).toLocaleString('fr-FR') + ' €' : '-', color: '#94a3b8' },
                { label: 'Loyer maximum', value: total > 0 ? Math.max(...locataires.map(l => l.loyer_montant || 0)).toLocaleString('fr-FR') + ' €' : '-', color: '#a78bfa' },
                { label: 'Potentiel annuel', value: (totalLoyers * 12).toLocaleString('fr-FR') + ' €', color: '#34d399' },
                { label: 'Pertes retard (mois)', value: loyersEnRetard.toLocaleString('fr-FR') + ' €', color: '#f87171' },
                { label: 'Taux occupation', value: total > 0 ? Math.round(((payes.length + enAttente.length + enRetard.length) / total) * 100) + '%' : '-', color: '#fbbf24' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-0.5px' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}