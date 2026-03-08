'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'
import { useToast } from '../../toast'

function joursEnRetard(d) { if (!d) return 0; return Math.floor((new Date() - new Date(d)) / 86400000) }
function joursDepuis(d) { if (!d) return null; return Math.floor((new Date() - new Date(d)) / 86400000) }
function joursAvantExpiration(d) { if (!d) return null; return Math.floor((new Date(d) - new Date()) / 86400000) }

function calcScoreDetail(l) {
  if (l.statut !== 'en_retard') return null
  const j = joursEnRetard(l.date_retard)
  const anciennete = l.contrat_debut ? joursDepuis(l.contrat_debut) : null
  const jamaisRelance = !l.derniere_relance
  const derniereRelance = l.derniere_relance ? joursDepuis(l.derniere_relance) : null

  if (anciennete !== null && anciennete < 60) return {
    score: null, niveau: 'nouveau', label: 'Nouveau', color: '#94a3b8',
    detail: [{ label: 'Ancienneté', pts: 0, max: 15, note: 'Moins de 2 mois — données insuffisantes' }],
    raison: 'Historique insuffisant pour calculer un score fiable.'
  }

  if (jamaisRelance && anciennete !== null && anciennete > 180) {
    const ptsLoyer = parseFloat(l.loyer_montant) >= 1200 ? 10 : parseFloat(l.loyer_montant) >= 800 ? 5 : 0
    return {
      score: 22, niveau: 'inhabituel', label: 'Inhabituel ⚡', color: '#a78bfa',
      detail: [
        { label: 'Jours de retard', pts: 8, max: 45, note: `${j}j — premier incident` },
        { label: 'Relances ignorées', pts: 0, max: 30, note: 'Jamais relancé' },
        { label: 'Ancienneté', pts: -8, max: 15, note: `${Math.floor(anciennete / 30)} mois — locataire fiable` },
        { label: 'Montant loyer', pts: ptsLoyer, max: 10, note: `${l.loyer_montant}€/mois` },
      ],
      raison: `Premier retard après ${Math.floor(anciennete / 30)} mois sans incident. Comportement inhabituel — privilégier le contact doux avant toute escalade.`
    }
  }

  let ptsRetard = 0, ptsRelance = 0, ptsAnciennete = 0, ptsLoyer = 0
  if (j >= 30) ptsRetard = 45
  else if (j >= 15) ptsRetard = 35
  else if (j >= 8) ptsRetard = 25
  else if (j >= 4) ptsRetard = 15
  else ptsRetard = 8

  if (derniereRelance !== null && derniereRelance <= 7) ptsRelance = 30
  else if (derniereRelance !== null && derniereRelance <= 14) ptsRelance = 20
  else if (!jamaisRelance) ptsRelance = 12

  if (anciennete !== null && anciennete < 120) ptsAnciennete = 15
  else if (anciennete !== null && anciennete < 365) ptsAnciennete = 8
  else if (anciennete !== null && anciennete >= 365) ptsAnciennete = -8

  const loyer = parseFloat(l.loyer_montant) || 0
  if (loyer >= 1200) ptsLoyer = 10
  else if (loyer >= 800) ptsLoyer = 5

  const score = Math.min(100, Math.max(5, ptsRetard + ptsRelance + ptsAnciennete + ptsLoyer))

  let niveau, labelNiveau, color
  if (score >= 75) { niveau = 'critique'; labelNiveau = 'Critique'; color = '#f87171' }
  else if (score >= 55) { niveau = 'eleve'; labelNiveau = 'Élevé'; color = '#f97316' }
  else if (score >= 35) { niveau = 'moyen'; labelNiveau = 'Moyen'; color = '#fb923c' }
  else { niveau = 'faible'; labelNiveau = 'Faible'; color = '#fbbf24' }

  const noteRelance = derniereRelance !== null && derniereRelance <= 7
    ? `Relancé il y a ${derniereRelance}j — n'a pas payé`
    : derniereRelance !== null ? `Relancé il y a ${derniereRelance}j`
    : 'Jamais relancé'

  const noteAnciennete = anciennete === null ? 'Date de début inconnue'
    : anciennete < 120 ? `${Math.floor(anciennete / 30)} mois — peu d'historique`
    : anciennete < 365 ? `${Math.floor(anciennete / 30)} mois d'ancienneté`
    : `${Math.floor(anciennete / 30)} mois — locataire de longue date`

  return {
    score, niveau, label: labelNiveau, color,
    detail: [
      { label: 'Jours de retard', pts: ptsRetard, max: 45, note: `${j} jours (+${ptsRetard}pts)` },
      { label: 'Relances ignorées', pts: ptsRelance, max: 30, note: `${noteRelance} (+${ptsRelance}pts)` },
      { label: 'Ancienneté', pts: ptsAnciennete, max: 15, note: `${noteAnciennete} (${ptsAnciennete > 0 ? '+' : ''}${ptsAnciennete}pts)` },
      { label: 'Montant loyer', pts: ptsLoyer, max: 10, note: `${l.loyer_montant}€/mois (+${ptsLoyer}pts)` },
    ],
    raison: score >= 75
      ? 'Situation critique. Engagement juridique à envisager si pas de réponse sous 48h.'
      : score >= 55 ? 'Risque élevé. Action immédiate nécessaire — relance ferme + appel téléphonique.'
      : score >= 35 ? 'Surveillance active recommandée. Relance dans les 48h.'
      : 'Retard récent. Un rappel amiable suffit à ce stade.'
  }
}

function recommandationsDetail(l) {
  if (l.statut !== 'en_retard') return []
  const s = calcScoreDetail(l)
  if (!s) return []
  if (s.niveau === 'inhabituel') return [
    { icon: '💜', titre: 'Relance douce', desc: 'Ton bienveillant — questionner la situation personnelle', priorite: 'Priorité 1' },
    { icon: '📞', titre: 'Appel téléphonique', desc: 'Vérifier si problème ponctuel ou structurel', priorite: 'Priorité 2' },
  ]
  if (s.niveau === 'critique') return [
    { icon: '🚨', titre: 'Mise en demeure', desc: 'Document officiel avec délai légal de paiement', priorite: 'Immédiat' },
    { icon: '📞', titre: 'Appel immédiat', desc: 'Contact direct avant toute procédure judiciaire', priorite: "Aujourd'hui" },
    { icon: '⚖️', titre: 'Procédure à envisager', desc: 'Consulter un huissier si pas de réponse sous 48h', priorite: 'Sous 48h' },
  ]
  if (s.niveau === 'eleve') return [
    { icon: '⚠️', titre: 'Relance ferme', desc: 'Email de mise en garde avec délai explicite', priorite: "Aujourd'hui" },
    { icon: '📞', titre: 'Appel obligatoire', desc: 'Ne pas laisser sans contact humain direct', priorite: "Aujourd'hui" },
    { icon: '👁', titre: 'Surveillance 30j', desc: 'Marquer pour suivi renforcé le mois prochain', priorite: 'À planifier' },
  ]
  if (s.niveau === 'moyen') return [
    { icon: '📧', titre: 'Relance ferme', desc: 'Email avec mention des conséquences possibles', priorite: 'Cette semaine' },
    { icon: '📞', titre: 'Appel conseillé', desc: 'Un appel augmente le taux de recouvrement de 40%', priorite: 'Cette semaine' },
  ]
  return [
    { icon: '📧', titre: 'Rappel amiable', desc: 'Email cordial — premier contact suffit à ce stade', priorite: 'Cette semaine' },
    { icon: '👁', titre: 'À surveiller', desc: 'Revérifier dans 5 jours si pas de paiement', priorite: 'Dans 5j' },
  ]
}

export default function LocataireDetail({ params }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [locataire, setLocataire] = useState(null)
  const [relances, setRelances] = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [nomAgence, setNomAgence] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const [{ data: loc }, { data: rel }, { data: agence }] = await Promise.all([
        supabase.from('locataires').select('*').eq('id', id).single(),
        supabase.from('relances').select('*').eq('locataire_id', id).order('envoye_le', { ascending: false }),
        supabase.from('agence').select('*').single()
      ])
      setLocataire(loc)
      setRelances(rel || [])
      if (agence) setNomAgence(agence.nom)
      setLoading(false)
      setTimeout(() => setMounted(true), 50)
    }
    init()
  }, [id])

  async function demanderRelance() {
    const j = joursEnRetard(locataire.date_retard)
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const template = templates?.find(t => j >= t.jours_min && (t.jours_max === null || j <= t.jours_max))
    if (!template) { toast('Aucun template pour ' + j + 'j de retard', 'error'); return }
    setConfirmation({ template, jours: j })
  }

  async function confirmerRelance() {
    const { template } = confirmation; setConfirmation(null)
    const replace = s => s.replace(/{nom}/g, locataire.nom).replace(/{montant}/g, locataire.loyer_montant).replace(/{appartement}/g, locataire.appartement)
    const res = await fetch('/api/relance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: locataire.nom, email: locataire.email, sujet: replace(template.sujet), corps: replace(template.corps).split('\n').join('<br/>'), locataire_id: locataire.id, template_nom: template.nom }) })
    if (res.ok) {
      toast('Relance envoyée', 'success')
      const now = new Date().toISOString()
      setLocataire(l => ({ ...l, derniere_relance: now }))
      setRelances(r => [{ template_nom: template.nom, envoye_le: now }, ...r])
    } else toast("Erreur lors de l'envoi", 'error')
  }

  async function marquerPaye() {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', id)
    setLocataire(l => ({ ...l, statut: 'paye', date_retard: null }))
    toast('Marqué comme payé ✓', 'success')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pb{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}`}</style>
      <div style={{ display: 'flex', gap: '6px' }}>{[0, .15, .3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pb .9s ease-in-out ${d}s infinite` }} />)}</div>
    </div>
  )
  if (!locataire) return <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui' }}>Locataire introuvable</div>

  const score = calcScoreDetail(locataire)
  const recs = recommandationsDetail(locataire)
  const j = joursEnRetard(locataire.date_retard)
  const jExpir = joursAvantExpiration(locataire.contrat_fin)
  const anciennete = locataire.contrat_debut ? joursDepuis(locataire.contrat_debut) : null
  const scoreColor = score?.color || '#94a3b8'
  const scoreNum = score?.score

  const fi = (d = 0) => ({ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: `opacity .45s ease ${d}s,transform .45s ease ${d}s` })
  const statutColor = locataire.statut === 'paye' ? '#34d399' : locataire.statut === 'en_retard' ? '#f87171' : '#fb923c'
  const statutLabel = locataire.statut === 'paye' ? 'Payé' : locataire.statut === 'en_retard' ? `En retard · ${j}j` : 'En attente'

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#1a1a24}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .15s;text-decoration:none;font-family:inherit}
        .btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}
        .bb{background:#2563eb;color:white}.bb:hover{background:#1d4ed8}
        .bg{background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.2)}
        .bgh{background:rgba(255,255,255,.06);color:#94a3b8}
        .bpu{background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.2)}
        .card{background:#13131a;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:22px 24px}
        .mb{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px;backdrop-filter:blur(6px)}
        .mo{background:#1a1a24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;max-width:440px;width:100%}
        @keyframes fiu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .ain{animation:fiu .35s ease forwards;opacity:0}
        .bar-bg{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;margin-top:5px}
        .bar-fill{height:100%;border-radius:3px;transition:width .9s cubic-bezier(.4,0,.2,1)}
        .rec-row{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:12px;margin-bottom:8px;transition:background .15s}
        .rec-row:hover{background:rgba(255,255,255,.04)}.rec-row:last-child{margin-bottom:0}
        .info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
        .info-row:last-child{border-bottom:none}
        .hist-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);margin-bottom:6px}
        .hist-row:last-child{margin-bottom:0}
      `}</style>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px', ...fi(0) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a href="/dashboard" className="btn bgh" style={{ padding: '7px 12px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              Retour
            </a>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-.4px' }}>{locataire.nom}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>{locataire.appartement}</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: statutColor, background: statutColor + '15', padding: '2px 9px', borderRadius: '20px' }}>{statutLabel}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {locataire.statut === 'en_retard' && <button className="btn bb" onClick={demanderRelance}>Envoyer relance</button>}
            {locataire.statut === 'en_retard' && <button className="btn bg" onClick={marquerPaye}>Marquer payé</button>}
            <a href={`/locataires/${id}/modifier`} className="btn bgh">Modifier la fiche</a>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* ═══ BLOC SCORE IA ═══ */}
          {score && (
            <div style={{ gridColumn: '1 / -1', background: `linear-gradient(135deg,${scoreColor}0a,rgba(37,99,235,.04))`, border: `1px solid ${scoreColor}28`, borderRadius: '18px', overflow: 'hidden', position: 'relative', ...fi(.06) }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,${scoreColor},${scoreColor}55,${scoreColor})` }} />
              <div style={{ padding: '24px 28px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '20px' }}>🧠 Score de risque IA</div>
                <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '90px' }}>
                    {scoreNum ? (
                      <>
                        <div style={{ fontSize: '56px', fontWeight: '800', color: scoreColor, fontFamily: "'DM Mono',monospace", lineHeight: 1, textShadow: `0 0 28px ${scoreColor}44` }}>{scoreNum}</div>
                        <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>/ 100</div>
                        <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: scoreColor + '18', border: `1px solid ${scoreColor}30`, padding: '4px 12px', borderRadius: '20px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: scoreColor, display: 'inline-block' }} />
                          <span style={{ fontSize: '12px', fontWeight: '700', color: scoreColor }}>{score.label}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', color: '#334155', fontWeight: '700' }}>—</div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{score.label}</div>
                      </div>
                    )}
                  </div>

                  {/* Décomposition barres */}
                  {score.detail && (
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Décomposition</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                        {score.detail.map((d, i) => {
                          const pct = Math.max(0, Math.min(100, (d.pts / d.max) * 100))
                          const barColor = d.pts <= 0 ? '#34d399' : d.pts >= d.max * .8 ? '#f87171' : d.pts >= d.max * .5 ? '#fb923c' : '#fbbf24'
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>{d.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '11px', color: '#475569' }}>{d.note}</span>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: barColor, fontFamily: "'DM Mono',monospace", minWidth: '30px', textAlign: 'right' }}>{d.pts > 0 ? '+' : ''}{d.pts}</span>
                                </div>
                              </div>
                              <div className="bar-bg">
                                <div className="bar-fill" style={{ width: pct + '%', background: barColor }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interprétation */}
                  <div style={{ flexShrink: 0, maxWidth: '200px', minWidth: '150px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Interprétation</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.65 }}>{score.raison}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ RECOMMANDATIONS IA ═══ */}
          {recs.length > 0 && (
            <div className="card" style={{ ...fi(.12) }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '16px' }}>🤖 Recommandations</div>
              {recs.map((rec, i) => (
                <div key={i} className="rec-row ain" style={{ animationDelay: i * .07 + 's' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{rec.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{rec.titre}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: scoreColor, background: scoreColor + '18', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>{rec.priorite}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.5 }}>{rec.desc}</div>
                  </div>
                </div>
              ))}
              {locataire.statut === 'en_retard' && (
                <button className="btn bb" style={{ width: '100%', justifyContent: 'center', marginTop: '14px', padding: '10px' }} onClick={demanderRelance}>
                  Envoyer la relance recommandée →
                </button>
              )}
            </div>
          )}

          {/* ═══ INFOS LOCATAIRE ═══ */}
          <div className="card" style={{ ...fi(.14) }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '16px' }}>📋 Informations</div>
            {[
              { label: 'Email', value: locataire.email || '—' },
              { label: 'Téléphone', value: locataire.telephone || '—' },
              { label: 'Loyer mensuel', value: locataire.loyer_montant ? locataire.loyer_montant + ' €' : '—' },
              { label: 'Échéance', value: locataire.loyer_echeance ? 'Le ' + locataire.loyer_echeance + ' du mois' : '—' },
              { label: 'Début contrat', value: locataire.contrat_debut ? new Date(locataire.contrat_debut).toLocaleDateString('fr-FR') : '—' },
              { label: 'Fin contrat', value: locataire.contrat_fin ? new Date(locataire.contrat_fin).toLocaleDateString('fr-FR') + (jExpir !== null ? (jExpir < 0 ? ' · expiré' : ` · dans ${jExpir}j`) : '') : '—' },
              { label: 'Ancienneté', value: anciennete !== null ? `${Math.floor(anciennete / 30)} mois` : '—' },
              { label: 'Dernière relance', value: locataire.derniere_relance ? `il y a ${joursDepuis(locataire.derniere_relance)}j · ${new Date(locataire.derniere_relance).toLocaleDateString('fr-FR')}` : 'Jamais relancé' },
            ].map((row, i) => (
              <div key={i} className="info-row">
                <span style={{ fontSize: '13px', color: '#475569' }}>{row.label}</span>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', textAlign: 'right', maxWidth: '55%' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ═══ HISTORIQUE RELANCES ═══ */}
          <div className="card" style={{ ...fi(.16) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em' }}>📨 Historique relances</div>
              <span style={{ fontSize: '12px', color: '#334155', background: 'rgba(255,255,255,.04)', padding: '2px 8px', borderRadius: '6px' }}>{relances.length} envoi{relances.length > 1 ? 's' : ''}</span>
            </div>
            {relances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#334155' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '13px' }}>Aucune relance envoyée</div>
                <div style={{ fontSize: '11px', color: '#1e293b', marginTop: '4px' }}>Ce locataire n'a jamais été relancé</div>
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {relances.map((r, i) => {
                  const d = joursDepuis(r.envoye_le)
                  return (
                    <div key={i} className="hist-row ain" style={{ animationDelay: i * .04 + 's' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.template_nom || 'Relance envoyée'}</div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{new Date(r.envoye_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#334155', flexShrink: 0 }}>il y a {d}j</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bannière retard */}
          {locataire.statut === 'en_retard' && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.15)', borderRadius: '14px', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', ...fi(.2) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '22px' }}>⏰</span>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#f87171' }}>Loyer en retard depuis {j} jour{j > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Depuis le {locataire.date_retard ? new Date(locataire.date_retard).toLocaleDateString('fr-FR') : '—'} · {locataire.loyer_montant}€ dus</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn bb" onClick={demanderRelance}>Envoyer relance</button>
                <button className="btn bg" onClick={marquerPaye}>Marquer payé</button>
              </div>
            </div>
          )}

          {jExpir !== null && jExpir <= 90 && (
            <div style={{ gridColumn: '1 / -1', background: 'rgba(251,191,36,.05)', border: '1px solid rgba(251,191,36,.15)', borderRadius: '14px', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: '12px', ...fi(.22) }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fbbf24' }}>{jExpir < 0 ? 'Contrat expiré' : `Contrat expire dans ${jExpir} jours`}</span>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Date de fin : {new Date(locataire.contrat_fin).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmation && (
        <div className="mb"><div className="mo">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>Confirmer l'envoi</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Envoyer <span style={{ color: '#60a5fa', fontWeight: '600' }}>"{confirmation.template.nom}"</span> à <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{locataire.nom}</span></p>
          <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>{confirmation.jours}j de retard · {locataire.appartement}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn bgh" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmation(null)}>Annuler</button>
            <button className="btn bb" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={confirmerRelance}>Envoyer</button>
          </div>
        </div></div>
      )}
    </div>
  )
}