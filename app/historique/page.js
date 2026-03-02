'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const MOIS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Historique() {
  const router = useRouter()
  const [locataires, setLocataires] = useState([])
  const [historique, setHistorique] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [loading, setLoading] = useState(true)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [saving, setSaving] = useState(null)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: locs } = await supabase.from('locataires').select('*').order('nom')
      setLocataires(locs || [])
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) setNomAgence(agence.nom)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from('historique_paiements').select('*').eq('annee', annee)
      setHistorique(data || [])
    }
    charger()
  }, [annee])

  function getStatut(locataireId, mois) {
    const entry = historique.find(h => h.locataire_id === locataireId && h.mois === mois + 1)
    return entry ? entry.statut : null
  }

  async function toggleStatut(locataire, mois) {
    setSaving(locataire.id + '-' + mois)
    const actuel = getStatut(locataire.id, mois)
    const entry = historique.find(h => h.locataire_id === locataire.id && h.mois === mois + 1)
    const next = !actuel || actuel === 'en_attente' ? 'paye' : actuel === 'paye' ? 'impaye' : 'en_attente'
    if (entry) {
      await supabase.from('historique_paiements').update({ statut: next, date_paiement: next === 'paye' ? new Date().toISOString() : null }).eq('id', entry.id)
      setHistorique(historique.map(h => h.id === entry.id ? { ...h, statut: next } : h))
    } else {
      const { data } = await supabase.from('historique_paiements').insert({ locataire_id: locataire.id, mois: mois + 1, annee, statut: next, montant: locataire.loyer_montant }).select().single()
      if (data) setHistorique([...historique, data])
    }
    setSaving(null)
  }

  async function marquerToutMois(mois) {
    for (const loc of locataires) {
      const entry = historique.find(h => h.locataire_id === loc.id && h.mois === mois + 1)
      if (entry) await supabase.from('historique_paiements').update({ statut: 'paye', date_paiement: new Date().toISOString() }).eq('id', entry.id)
      else await supabase.from('historique_paiements').insert({ locataire_id: loc.id, mois: mois + 1, annee, statut: 'paye', montant: loc.loyer_montant })
    }
    const { data } = await supabase.from('historique_paiements').select('*').eq('annee', annee)
    setHistorique(data || [])
  }

  function tauxPaiement(mois) {
    if (!locataires.length) return 0
    return Math.round(locataires.filter(l => getStatut(l.id, mois) === 'paye').length / locataires.length * 100)
  }

  function totalMois(mois) {
    return historique.filter(h => h.mois === mois + 1 && h.statut === 'paye').reduce((acc, h) => acc + (parseFloat(h.montant) || 0), 0)
  }

  const locsFiltres = recherche ? locataires.filter(l => l.nom.toLowerCase().includes(recherche.toLowerCase()) || l.appartement.toLowerCase().includes(recherche.toLowerCase())) : locataires
  const moisActuel = new Date().getMonth()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse 0.9s ease ${d}s infinite` }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #1a1a24; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; } .cell-btn { border: none; cursor: pointer; border-radius: 8px; width: 36px; height: 28px; font-size: 12px; font-weight: 700; transition: all 0.15s; } .cell-btn:hover { transform: scale(1.1); }`}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <div><div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</div>{nomAgence && <div style={{ fontSize: '11px', color: '#475569' }}>{nomAgence}</div>}</div>
        </a>
        {[{ href: '/dashboard', label: 'Dashboard' }, { href: '/stats', label: 'Statistiques' }].map(l => (
          <a key={l.href} href={l.href} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#64748b', textDecoration: 'none', transition: 'all 0.2s', display: 'block' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b' }}>{l.label}</a>
        ))}
        <a href="/historique" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#60a5fa', textDecoration: 'none', background: 'rgba(59,130,246,0.15)', display: 'block' }}>📅 Historique</a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Historique des paiements</h1>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{locataires.length} locataires · Cliquez sur une case pour changer le statut</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '6px 12px' }}>
            <button onClick={() => setAnnee(annee - 1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '16px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.target.style.color = '#e2e8f0'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.background = 'none' }}>←</button>
            <span style={{ fontWeight: '700', color: '#f1f5f9', fontFamily: "'DM Mono', monospace", fontSize: '15px', width: '50px', textAlign: 'center' }}>{annee}</span>
            <button onClick={() => setAnnee(annee + 1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '16px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.target.style.color = '#e2e8f0'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.background = 'none' }}>→</button>
          </div>
        </div>

        {/* Legende */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          {[{ color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: '✓ Paye' }, { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: '✗ Impaye' }, { color: '#475569', bg: 'rgba(255,255,255,0.05)', label: '· Non renseigne' }].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '28px', height: '22px', borderRadius: '6px', background: l.bg, color: l.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>{l.label.split(' ')[0]}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{l.label.split(' ')[1]}</span>
            </div>
          ))}
        </div>

        {/* Recherche */}
        <div style={{ marginBottom: '16px' }}>
          <input placeholder="Rechercher un locataire..." value={recherche} onChange={e => setRecherche(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 16px', color: '#f1f5f9', fontSize: '13px', outline: 'none', width: '280px', fontFamily: 'inherit' }} />
        </div>

        {/* Tableau */}
        <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontWeight: '600', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', left: 0, background: '#13131a', minWidth: '180px' }}>Locataire</th>
                {MOIS.map((m, i) => (
                  <th key={m} style={{ padding: '10px 4px', fontWeight: '600', textAlign: 'center', minWidth: '52px', color: i === moisActuel && annee === new Date().getFullYear() ? '#60a5fa' : '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                    <div>{m}</div>
                    <div style={{ fontWeight: '400', color: '#334155', marginTop: '2px', fontSize: '10px' }}>{tauxPaiement(i)}%</div>
                  </th>
                ))}
                <th style={{ padding: '10px 16px', textAlign: 'center', color: '#475569', fontSize: '11px', textTransform: 'uppercase', minWidth: '60px' }}>Taux</th>
              </tr>
            </thead>
            <tbody>
              {locsFiltres.map(l => {
                const moisPayes = MOIS.filter((_, i) => getStatut(l.id, i) === 'paye').length
                const taux = Math.round(moisPayes / 12 * 100)
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 20px', position: 'sticky', left: 0, background: 'inherit', backgroundColor: '#13131a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#60a5fa', flexShrink: 0 }}>
                          {l.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{l.nom}</div>
                          <div style={{ fontSize: '11px', color: '#475569' }}>{l.appartement} · <span style={{ fontFamily: "'DM Mono'" }}>{l.loyer_montant}€</span></div>
                        </div>
                      </div>
                    </td>
                    {MOIS.map((m, i) => {
                      const statut = getStatut(l.id, i)
                      const isSaving = saving === l.id + '-' + i
                      const bg = statut === 'paye' ? 'rgba(52,211,153,0.12)' : statut === 'impaye' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)'
                      const color = statut === 'paye' ? '#34d399' : statut === 'impaye' ? '#f87171' : '#334155'
                      const label = statut === 'paye' ? '✓' : statut === 'impaye' ? '✗' : '·'
                      return (
                        <td key={m} style={{ padding: '12px 4px', textAlign: 'center' }}>
                          <button className="cell-btn" onClick={() => toggleStatut(l, i)} disabled={!!isSaving} style={{ background: bg, color, width: '36px', height: '28px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.15s' }}>
                            {isSaving ? '…' : label}
                          </button>
                        </td>
                      )
                    })}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', fontFamily: "'DM Mono'", background: taux === 100 ? 'rgba(52,211,153,0.12)' : taux >= 75 ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)', color: taux === 100 ? '#34d399' : taux >= 75 ? '#fbbf24' : '#f87171' }}>
                        {taux}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', position: 'sticky', left: 0, background: '#13131a' }}>Total encaisse</td>
                {MOIS.map((m, i) => (
                  <td key={m} style={{ padding: '12px 4px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#475569', fontFamily: "'DM Mono'" }}>
                    {totalMois(i) > 0 ? totalMois(i).toLocaleString('fr-FR') + '€' : '—'}
                  </td>
                ))}
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#34d399', fontFamily: "'DM Mono'" }}>
                  {MOIS.reduce((acc, _, i) => acc + totalMois(i), 0).toLocaleString('fr-FR')}€
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px 20px', fontSize: '11px', color: '#334155', position: 'sticky', left: 0, background: '#13131a' }}>Tout marquer paye</td>
                {MOIS.map((m, i) => (
                  <td key={m} style={{ padding: '10px 4px', textAlign: 'center' }}>
                    <button onClick={() => marquerToutMois(i)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: '4px', borderRadius: '4px', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.target.style.background = 'rgba(59,130,246,0.1)'}
                      onMouseLeave={e => e.target.style.background = 'none'}>✓</button>
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}