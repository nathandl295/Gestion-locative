'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import { useToast } from '../toast'

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  return Math.floor((new Date() - new Date(dateRetard)) / 86400000)
}
function joursDepuis(date) {
  if (!date) return null
  return Math.floor((new Date() - new Date(date)) / 86400000)
}
function prochainPaiement(echeance) {
  if (!echeance) return null
  const auj = new Date(), j = auj.getDate(), m = auj.getMonth(), a = auj.getFullYear()
  if (j < echeance) return echeance - j
  return new Date(a, m + 1, 0).getDate() - j + echeance
}
function joursAvantExpiration(contrat_fin) {
  if (!contrat_fin) return null
  return Math.floor((new Date(contrat_fin) - new Date()) / 86400000)
}
function scoreRisque(l) {
  if (l.statut !== 'en_retard') return null
  const j = joursEnRetard(l.date_retard)
  const anciennete = l.contrat_debut ? joursDepuis(l.contrat_debut) : null
  const jamaisRelance = !l.derniere_relance
  const derniereRelance = l.derniere_relance ? joursDepuis(l.derniere_relance) : null

  // Données insuffisantes
  if (anciennete !== null && anciennete < 60) {
    return { score: null, niveau: 'nouveau', label: 'Nouveau', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8', raisons: ['Historique insuffisant'] }
  }
  // Comportement inhabituel
  if (jamaisRelance && anciennete !== null && anciennete > 180) {
    return { score: 22, niveau: 'inhabituel', label: 'Inhabituel ⚡', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', dot: '#a78bfa', raisons: [`Premier retard`, `${Math.floor(anciennete / 30)} mois sans incident`] }
  }

  // Calcul score numérique 0-100
  let pts = 0
  // 1. Jours de retard (0-45 pts)
  if (j >= 30) pts += 45
  else if (j >= 15) pts += 35
  else if (j >= 8) pts += 25
  else if (j >= 4) pts += 15
  else pts += 8

  // 2. Relances ignorées (0-30 pts)
  if (derniereRelance !== null && derniereRelance <= 7) pts += 30  // relancé récemment, n'a pas payé
  else if (derniereRelance !== null && derniereRelance <= 14) pts += 20
  else if (!jamaisRelance) pts += 12

  // 3. Ancienneté courte = moins de data fiable (0-15 pts)
  if (anciennete !== null && anciennete < 120) pts += 15
  else if (anciennete !== null && anciennete < 365) pts += 8
  else if (anciennete !== null && anciennete >= 365) pts -= 8 // locataire long = moins risqué

  // 4. Montant élevé = risque financier fort (0-10 pts)
  const loyer = parseFloat(l.loyer_montant) || 0
  if (loyer >= 1200) pts += 10
  else if (loyer >= 800) pts += 5

  const score = Math.min(100, Math.max(5, pts))

  if (score >= 75) return { score, niveau: 'critique', label: 'Critique', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#f87171', raisons: [`${j}j de retard`, 'Mise en demeure urgente'] }
  if (score >= 55) return { score, niveau: 'eleve', label: 'Élevé', color: '#f97316', bg: 'rgba(249,115,22,0.08)', dot: '#f97316', raisons: [`${j}j de retard`, 'Action immédiate'] }
  if (score >= 35) return { score, niveau: 'moyen', label: 'Moyen', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', dot: '#fb923c', raisons: [`${j}j de retard`, 'Surveillance active'] }
  return { score, niveau: 'faible', label: 'Faible', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', dot: '#fbbf24', raisons: [`${j}j de retard`, 'Relance préventive'] }
}

function recommandationsIA(l) {
  if (l.statut !== 'en_retard') return []
  const j = joursEnRetard(l.date_retard)
  const s = scoreRisque(l)
  const anciennete = l.contrat_debut ? joursDepuis(l.contrat_debut) : null
  const derniereRelance = l.derniere_relance ? joursDepuis(l.derniere_relance) : null
  const recs = []

  if (!s) return [{ label: 'Relance standard', color: '#94a3b8' }]

  if (s.niveau === 'inhabituel') {
    recs.push({ label: '💜 Relance douce', color: '#a78bfa' })
    recs.push({ label: '📞 Vérifier situation', color: '#a78bfa' })
    return recs
  }
  if (s.niveau === 'critique') {
    recs.push({ label: '🚨 Mise en demeure', color: '#f87171' })
    recs.push({ label: '📞 Appel immédiat', color: '#f87171' })
    recs.push({ label: '⚖️ Procédure à envisager', color: '#f87171' })
    return recs
  }
  if (s.niveau === 'eleve') {
    recs.push({ label: '⚠️ Relance ferme', color: '#f97316' })
    recs.push({ label: '📞 Appel obligatoire', color: '#f97316' })
    if (derniereRelance !== null && derniereRelance <= 7) recs.push({ label: '👁 Surveillance 30j', color: '#f97316' })
    return recs
  }
  if (s.niveau === 'moyen') {
    recs.push({ label: '📧 Relance ferme', color: '#fb923c' })
    recs.push({ label: '📞 Appel conseillé', color: '#fb923c' })
    return recs
  }
  // faible
  recs.push({ label: '📧 Rappel amiable', color: '#fbbf24' })
  if (j >= 3) recs.push({ label: '👁 À surveiller', color: '#fbbf24' })
  return recs
}

function niveauRelance(l) {
  const j = joursEnRetard(l.date_retard)
  if (j >= 21) return { label: 'Niveau 3 · Mise en demeure', color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
  if (j >= 8) return { label: 'Niveau 2 · Relance ferme', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' }
  return { label: 'Niveau 1 · Premier rappel', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
}

async function appellerClaudeIA(locataires, nomAgence) {
  const enRetard = locataires.filter(l => l.statut === 'en_retard')
  if (enRetard.length === 0) return { tout_ok: true, lignes: [], action: null }
  const contexte = enRetard.map(l => {
    const j = joursEnRetard(l.date_retard)
    const s = scoreRisque(l)
    const anciennete = l.contrat_debut ? Math.floor(joursDepuis(l.contrat_debut) / 30) : null
    return `- ${l.nom} (${l.appartement}) : ${j}j de retard, ${l.loyer_montant}€, risque ${s ? s.niveau : 'inconnu'}${anciennete ? `, locataire depuis ${anciennete} mois` : ''}${l.derniere_relance ? `, dernière relance il y a ${joursDepuis(l.derniere_relance)}j` : ', jamais relancé'}`
  }).join('\n')
  const prompt = `Tu es le copilote de recouvrement de l'agence immobilière "${nomAgence || 'GestImmo'}".

Voici la situation des loyers en retard aujourd'hui :
${contexte}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, avec exactement ce format :
{"lignes":["observation 1 courte","observation 2 courte","observation 3 courte"],"action":"action recommandée prioritaire en 1 phrase","urgence":"haute"}

urgence doit être "haute", "normale" ou "faible". Les observations: précises, max 12 mots chacune. Ton direct et professionnel.`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
  })
  const data = await res.json()
  const texte = data.content?.map(c => c.text || '').join('').trim()
  return JSON.parse(texte)
}

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [locataires, setLocataires] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState('retard')
  const [filtreRisque, setFiltreRisque] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [confirmReinit, setConfirmReinit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tri, setTri] = useState('retard_desc')
  const [showExport, setShowExport] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [analyseIA, setAnalyseIA] = useState(null)
  const [analyseErreur, setAnalyseErreur] = useState(false)
  const [showTraiterTout, setShowTraiterTout] = useState(false)
  const [relancesPreview, setRelancesPreview] = useState([])
  const [envoyerEnCours, setEnvoyerEnCours] = useState(false)
  const [envoyeCount, setEnvoyeCount] = useState(0)
  const [confirmCritiques, setConfirmCritiques] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: locs } = await supabase.from('locataires').select('*')
      const locsData = locs || []
      setLocataires(locsData)
      const { data: agence } = await supabase.from('agence').select('*').single()
      const agenceNom = agence?.nom || ''
      if (agence) setNomAgence(agenceNom)
      setLoading(false)
      setTimeout(() => setMounted(true), 50)
      if (locsData.some(l => l.statut === 'en_retard')) {
        lancerAnalyse(locsData, agenceNom)
      }
    }
    init()
  }, [])

  async function lancerAnalyse(locs, agNom) {
    setAnalyseIA('loading')
    setAnalyseErreur(false)
    try {
      const result = await appellerClaudeIA(locs || locataires, agNom !== undefined ? agNom : nomAgence)
      setAnalyseIA(result)
    } catch (e) {
      console.error('Erreur IA', e)
      setAnalyseErreur(true)
      setAnalyseIA(null)
    }
  }

  async function ouvrirTraiterTout() {
    const enRetard = locataires.filter(l => l.statut === 'en_retard')
    if (!enRetard.length) { toast('Aucun loyer en retard', 'info'); return }
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const previews = enRetard.map(l => {
      const j = joursEnRetard(l.date_retard)
      const template = templates?.find(t => j >= t.jours_min && (t.jours_max === null || j <= t.jours_max))
      if (!template) return null
      const replace = (str) => str.replace(/{nom}/g, l.nom).replace(/{montant}/g, l.loyer_montant).replace(/{appartement}/g, l.appartement)
      return { locataire: l, template, corps: replace(template.corps), sujet: replace(template.sujet), selectionne: true }
    }).filter(Boolean)
    setRelancesPreview(previews)
    setEnvoyeCount(0)
    setShowTraiterTout(true)
  }

  async function ouvrirTraiterCritiques() {
    const cibles = locataires.filter(l => { const s = scoreRisque(l); return s && (s.niveau === 'critique' || s.niveau === 'eleve') })
    if (!cibles.length) { toast('Aucun dossier critique', 'info'); return }
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const previews = cibles.map(l => {
      const j = joursEnRetard(l.date_retard)
      const template = templates?.find(t => j >= t.jours_min && (t.jours_max === null || j <= t.jours_max))
      if (!template) return null
      const replace = (str) => str.replace(/{nom}/g, l.nom).replace(/{montant}/g, l.loyer_montant).replace(/{appartement}/g, l.appartement)
      return { locataire: l, template, corps: replace(template.corps), sujet: replace(template.sujet), score: scoreRisque(l) }
    }).filter(Boolean)
    if (!previews.length) { toast('Aucun template applicable', 'error'); return }
    setConfirmCritiques(previews)
  }

  async function envoyerCritiques() {
    if (!confirmCritiques?.length) return
    setEnvoyerEnCours(true)
    let count = 0
    for (const r of confirmCritiques) {
      try {
        const res = await fetch('/api/relance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: r.locataire.nom, email: r.locataire.email, sujet: r.sujet, corps: r.corps.split('\n').join('<br/>'), locataire_id: r.locataire.id, template_nom: r.template.nom }) })
        if (res.ok) { count++; setLocataires(l => l.map(x => x.id === r.locataire.id ? { ...x, derniere_relance: new Date().toISOString() } : x)) }
      } catch (e) {}
    }
    setEnvoyerEnCours(false)
    setConfirmCritiques(null)
    toast(`${count} relance${count > 1 ? 's' : ''} critique${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''} ✓`, 'success')
  }

  async function envoyerTout() {
    const aEnvoyer = relancesPreview.filter(r => r.selectionne)
    if (!aEnvoyer.length) { toast('Aucune relance sélectionnée', 'error'); return }
    setEnvoyerEnCours(true)
    let count = 0
    for (const r of aEnvoyer) {
      try {
        const res = await fetch('/api/relance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: r.locataire.nom, email: r.locataire.email, sujet: r.sujet, corps: r.corps.split('\n').join('<br/>'), locataire_id: r.locataire.id, template_nom: r.template.nom }) })
        if (res.ok) { count++; setEnvoyeCount(count); setLocataires(l => l.map(x => x.id === r.locataire.id ? { ...x, derniere_relance: new Date().toISOString() } : x)) }
      } catch (e) {}
    }
    setEnvoyerEnCours(false)
    setShowTraiterTout(false)
    toast(`${count} relance${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''} ✓`, 'success')
  }

  async function deconnexion() { await supabase.auth.signOut(); router.push('/login') }
  async function reinitialiserMois() {
    await supabase.from('locataires').update({ statut: 'en_attente' }).eq('statut', 'paye')
    setLocataires(l => l.map(x => x.statut === 'paye' ? { ...x, statut: 'en_attente' } : x))
    setConfirmReinit(false); setOnglet('attente'); toast('Nouveau mois initialisé', 'info')
  }
  async function marquerPaye(id, nom) {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', id)
    setLocataires(l => l.map(x => x.id === id ? { ...x, statut: 'paye', date_retard: null } : x))
    toast(nom + ' marqué comme payé', 'success')
  }
  async function marquerEnRetard(id) {
    const jours = prompt("Depuis combien de jours ? (0 = aujourd'hui)")
    if (jours === null) return
    const date = new Date(); date.setDate(date.getDate() - parseInt(jours || 0))
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: date.toISOString() }).eq('id', id)
    setLocataires(l => l.map(x => x.id === id ? { ...x, statut: 'en_retard', date_retard: date.toISOString() } : x))
    toast('Locataire passé en retard', 'warning')
  }
  async function toutMarquerPaye() {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('statut', 'en_attente')
    setLocataires(l => l.map(x => x.statut === 'en_attente' ? { ...x, statut: 'paye', date_retard: null } : x))
    setOnglet('paye'); toast('Tous marqués comme payés', 'success')
  }
  async function toutMarquerEnRetard() {
    const date = new Date().toISOString()
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: date }).eq('statut', 'en_attente')
    setLocataires(l => l.map(x => x.statut === 'en_attente' ? { ...x, statut: 'en_retard', date_retard: date } : x))
    setOnglet('retard'); toast('Tous passés en retard', 'warning')
  }
  async function demanderRelance(locataire) {
    const jours = joursEnRetard(locataire.date_retard)
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const template = templates?.find(t => jours >= t.jours_min && (t.jours_max === null || jours <= t.jours_max))
    if (!template) { toast('Aucun template pour ' + jours + 'j de retard', 'error'); return }
    setConfirmation({ locataire, template, jours })
  }
  async function confirmerRelance() {
    const { locataire, template } = confirmation; setConfirmation(null)
    const replace = (str) => str.replace(/{nom}/g, locataire.nom).replace(/{montant}/g, locataire.loyer_montant).replace(/{appartement}/g, locataire.appartement)
    const res = await fetch('/api/relance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: locataire.nom, email: locataire.email, sujet: replace(template.sujet), corps: replace(template.corps).split('\n').join('<br/>'), locataire_id: locataire.id, template_nom: template.nom }) })
    if (res.ok) toast('Relance envoyée à ' + locataire.nom, 'success')
    else toast("Erreur lors de l'envoi", 'error')
    setLocataires(l => l.map(x => x.id === locataire.id ? { ...x, derniere_relance: new Date().toISOString() } : x))
  }
  function genererQuittance(locataire) {
    const now = new Date(), mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), moisC = mois.charAt(0).toUpperCase() + mois.slice(1), dateAuj = now.toLocaleDateString('fr-FR')
    const debut = '01/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear()
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('fr-FR')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quittance</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1a1a1a;padding:60px;max-width:800px;margin:0 auto}</style></head><body><h1 style="color:#2563eb;border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px">${nomAgence || 'GestImmo'} — Quittance de loyer ${moisC}</h1><p><strong>Locataire :</strong> ${locataire.nom}</p><p><strong>Logement :</strong> ${locataire.appartement}</p><p><strong>Période :</strong> ${debut} au ${fin}</p><p><strong>Loyer :</strong> ${locataire.loyer_montant} €</p><br/><p>Je soussigné(e), ${nomAgence || 'le gestionnaire'}, déclare avoir reçu de ${locataire.nom} la somme de ${locataire.loyer_montant} euros pour le mois de ${moisC}.</p><br/><p>Émis le ${dateAuj}</p><script>window.onload=function(){window.print()}<\/script></body></html>`
    const blob = new Blob([html], { type: 'text/html' }), url = URL.createObjectURL(blob), a = document.createElement('a')
    a.href = url; a.download = 'quittance_' + locataire.nom.replace(/ /g, '_') + '.html'; a.click(); URL.revokeObjectURL(url)
    toast('Quittance générée', 'success')
  }
  function exporterCSV() {
    const csv = [['Nom', 'Email', 'Tel', 'Appt', 'Loyer', 'Statut'], ...locataires.map(l => [l.nom, l.email || '', l.telephone || '', l.appartement, l.loyer_montant, l.statut])].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'locataires.csv'; a.click()
    setShowExport(false); toast('Export CSV téléchargé', 'success')
  }
  function filtrer(liste) {
    let r = [...liste]
    if (filtreRisque) r = r.filter(l => { const s = scoreRisque(l); if (filtreRisque === 'critique') return s && (s.niveau === 'critique' || s.niveau === 'eleve'); if (filtreRisque === 'surveiller') return s && (s.niveau === 'moyen' || s.niveau === 'inhabituel'); if (filtreRisque === 'inhabituel') return s && s.niveau === 'inhabituel'; return true })
    if (recherche) { const q = recherche.toLowerCase(); r = r.filter(l => l.nom.toLowerCase().includes(q) || l.appartement.toLowerCase().includes(q) || (l.email && l.email.toLowerCase().includes(q))) }
    return r.sort((a, b) => tri === 'retard_desc' ? joursEnRetard(b.date_retard) - joursEnRetard(a.date_retard) : tri === 'nom_asc' ? a.nom.localeCompare(b.nom) : b.loyer_montant - a.loyer_montant)
  }
  function activerFiltreRisque(f) { setFiltreRisque(p => p === f ? null : f); setOnglet('retard') }
  function getRecommandations() {
    return locataires.filter(l => l.statut === 'en_retard').map(l => {
      const j = joursEnRetard(l.date_retard), dr = joursDepuis(l.derniere_relance)
      if (j >= 21) return { locataire: l, jours: j, message: `Mise en demeure — ${j}j`, couleur: '#f87171', icon: '🚨' }
      if (j >= 8 && (dr === null || dr >= 7)) return { locataire: l, jours: j, message: `Relance ferme — ${j}j`, couleur: '#fb923c', icon: '⚠️' }
      if (j >= 1 && dr === null) return { locataire: l, jours: j, message: `Premier rappel — ${j}j`, couleur: '#fbbf24', icon: '💬' }
      return null
    }).filter(Boolean).sort((a, b) => b.jours - a.jours).slice(0, 4)
  }

  const enRetard = filtrer(locataires.filter(l => l.statut === 'en_retard'))
  const payes = filtrer(locataires.filter(l => l.statut === 'paye'))
  const enAttente = filtrer(locataires.filter(l => l.statut === 'en_attente'))
  const tous = filtrer(locataires)
  const totalRetard = locataires.filter(l => l.statut === 'en_retard').length
  const totalPaye = locataires.filter(l => l.statut === 'paye').length
  const totalAttente = locataires.filter(l => l.statut === 'en_attente').length
  const totalLoyers = locataires.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const contratsExpirants = locataires.filter(l => { const j = joursAvantExpiration(l.contrat_fin); return j !== null && j <= 90 })
  const loyersArisque = locataires.filter(l => l.statut === 'en_retard').reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const loyersSecurisables = locataires.filter(l => l.statut === 'en_retard' && joursEnRetard(l.date_retard) < 15).reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const dossiersCritiques = locataires.filter(l => { const s = scoreRisque(l); return s && (s.niveau === 'critique' || s.niveau === 'eleve') })
  const dossiersASurveiller = locataires.filter(l => { const s = scoreRisque(l); return s && (s.niveau === 'moyen' || s.niveau === 'inhabituel') })
  const locInhabituels = locataires.filter(l => { const s = scoreRisque(l); return s && s.niveau === 'inhabituel' })
  const recommandations = getRecommandations()
  const listeActive = onglet === 'retard' ? enRetard : onglet === 'paye' ? payes : onglet === 'attente' ? enAttente : tous
  const urgenceColor = analyseIA && analyseIA !== 'loading' && !analyseIA.tout_ok ? (analyseIA.urgence === 'haute' ? '#f87171' : analyseIA.urgence === 'normale' ? '#fb923c' : '#fbbf24') : '#34d399'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pb{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}`}</style>
      <div style={{ display: 'flex', gap: '6px' }}>{[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pb 0.9s ease-in-out ${d}s infinite` }} />)}</div>
    </div>
  )

  const fi = (d = 0) => ({ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: `opacity .5s ease ${d}s,transform .5s ease ${d}s` })

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#1a1a24}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        .nl{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:14px;font-weight:500;color:#94a3b8;text-decoration:none;transition:all .2s;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-family:inherit}
        .nl:hover{background:rgba(255,255,255,.06);color:#e2e8f0}.nl.active{background:rgba(59,130,246,.15);color:#60a5fa}
        .nl.ai{background:linear-gradient(135deg,rgba(37,99,235,.15),rgba(124,58,237,.15));color:#a5b4fc;border:1px solid rgba(99,102,241,.2)}
        .nl.ai:hover{background:linear-gradient(135deg,rgba(37,99,235,.25),rgba(124,58,237,.25));color:#c4b5fd}
        .sc{border-radius:14px;padding:16px 18px;border:1px solid rgba(255,255,255,.06);transition:all .2s;cursor:pointer}
        .sc:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.12)}
        .ri{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s}
        .ri:last-child{border-bottom:none}.ri:hover{background:rgba(255,255,255,.03)}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .15s;text-decoration:none;font-family:inherit}
        .btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}
        .bb{background:#2563eb;color:white}.bb:hover{background:#1d4ed8}
        .bg{background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.2)}
        .br{background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.2)}
        .bgh{background:rgba(255,255,255,.06);color:#94a3b8}
        .bpu{background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.2)}
        .bm{background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;box-shadow:0 0 20px rgba(124,58,237,.35);font-weight:600}
        .bm:hover{box-shadow:0 0 28px rgba(124,58,237,.5);transform:translateY(-2px)}
        .bdg{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
        .tab{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .tab.on{background:#2563eb;color:white}.tab.off{background:transparent;color:#64748b}.tab.off:hover{color:#94a3b8;background:rgba(255,255,255,.04)}
        .is{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 16px;color:#e2e8f0;font-size:14px;outline:none;width:100%;transition:all .2s;font-family:inherit}
        .is:focus{border-color:rgba(59,130,246,.4);background:rgba(255,255,255,.07)}
        .mb{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px;backdrop-filter:blur(6px)}
        .mo{background:#1a1a24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;max-width:440px;width:100%}
        .mol{background:#1a1a24;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;max-width:680px;width:100%;max-height:88vh;display:flex;flex-direction:column}
        .fb{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;border:1px solid transparent;cursor:pointer;transition:all .15s;font-family:inherit;width:100%;text-align:left}
        .fb:hover{background:rgba(255,255,255,.05)}
        .rr{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);margin-bottom:8px;transition:all .15s;cursor:pointer}
        .rr:hover{background:rgba(255,255,255,.04)}.rr.off{opacity:.4}
        @keyframes fiu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sh{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pd{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        @keyframes sp{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .ain{animation:fiu .4s ease forwards;opacity:0}
        .ish{background:linear-gradient(90deg,rgba(124,58,237,.05) 25%,rgba(124,58,237,.12) 50%,rgba(124,58,237,.05) 75%);background-size:200% 100%;animation:sh 1.8s infinite}
        .pdot{animation:pd 1.5s ease-in-out infinite}
        .spin{animation:sp 1s linear infinite;display:inline-block}
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar */}
        <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity=".7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity=".4"/></svg>
            <div><div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-.3px' }}>GestImmo</div>{nomAgence && <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{nomAgence}</div>}</div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Navigation</div>
          <button className="nl active"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Dashboard</button>
          <a href="/stats" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Statistiques</a>
          <a href="/historique" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Historique</a>
          <a href="/locataires/nouveau" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nouveau locataire</a>
          <div style={{ margin: '8px 0' }}>
            <a href="/agent" className="nl ai">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
              Assistant IA
              {recommandations.length > 0 && <span style={{ marginLeft: 'auto', background: '#7c3aed', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>{recommandations.length}</span>}
            </a>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Paramètres</div>
          <a href="/membres" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Équipe</a>
          <a href="/parametres" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Paramètres</a>
          <a href="/import" className="nl"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Importer CSV</a>
          <button className="nl" onClick={() => setShowExport(true)}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exporter</button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', margin: '8px 0' }} />
          <button className="nl" onClick={deconnexion} style={{ color: '#f87171' }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Déconnexion</button>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', ...fi(.05) }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-.5px' }}>Dashboard</h1>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn bgh" onClick={() => setConfirmReinit(true)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Nouveau mois</button>
              <a href="/locataires/nouveau" className="btn bb"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nouveau locataire</a>
            </div>
          </div>

          {/* ════ BLOC IA ════ */}
          <div style={{ marginBottom: '20px', ...fi(.08) }}>
            <div style={{ borderRadius: '18px', border: '1px solid rgba(124,58,237,.28)', background: 'linear-gradient(135deg,rgba(124,58,237,.07) 0%,rgba(37,99,235,.05) 100%)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,#7c3aed,#2563eb,#7c3aed)', opacity: .7 }} />
              <div style={{ padding: '18px 22px' }}>
                {/* Titre */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🧠</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em' }}>Analyse IA du jour</span>
                    {analyseIA === 'loading' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} className="pdot" />}
                    {analyseIA && analyseIA !== 'loading' && !analyseIA.tout_ok && (
                      <span style={{ fontSize: '11px', fontWeight: '600', color: urgenceColor, background: urgenceColor + '18', padding: '2px 8px', borderRadius: '20px' }}>
                        {analyseIA.urgence === 'haute' ? '● Urgence haute' : analyseIA.urgence === 'normale' ? '● Attention requise' : '● À surveiller'}
                      </span>
                    )}
                  </div>
                  <button className="btn bgh" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => lancerAnalyse(undefined, undefined)}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={analyseIA === 'loading' ? { animation: 'sp 1s linear infinite' } : {}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Actualiser
                  </button>
                </div>
                {/* Contenu */}
                {analyseIA === 'loading' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[72, 55, 82].map((w, i) => <div key={i} className="ish" style={{ height: '14px', borderRadius: '7px', width: w + '%' }} />)}
                  </div>
                )}
                {analyseErreur && <div style={{ color: '#64748b', fontSize: '13px' }}>Impossible de charger l'analyse. Vérifie ta connexion.</div>}
                {analyseIA && analyseIA !== 'loading' && analyseIA.tout_ok && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <span style={{ fontSize: '14px', color: '#34d399', fontWeight: '500' }}>Tout est en ordre — aucune action requise aujourd'hui.</span>
                  </div>
                )}
                {analyseIA && analyseIA !== 'loading' && !analyseIA.tout_ok && (
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Observations */}
                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analyseIA.lignes?.map((ligne, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ color: '#7c3aed', marginTop: '2px', flexShrink: 0, fontSize: '14px' }}>—</span>
                          <span style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>{ligne}</span>
                        </div>
                      ))}
                    </div>
                    {/* Action + bouton */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, minWidth: '220px' }}>
                      {analyseIA.action && (
                        <div style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)', borderRadius: '10px', padding: '10px 14px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Action recommandée</div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>{analyseIA.action}</div>
                        </div>
                      )}
                      {totalRetard > 0 && (
                        <button className="btn bm" onClick={ouvrirTraiterTout} style={{ justifyContent: 'center', padding: '10px 18px', fontSize: '14px' }}>
                          ⚡ Traiter les {totalRetard} retard{totalRetard > 1 ? 's' : ''}
                        </button>
                      )}
                      {dossiersCritiques.length > 0 && (
                        <button className="btn br" onClick={ouvrirTraiterCritiques} style={{ justifyContent: 'center', padding: '10px 18px', fontSize: '14px', border: '1px solid rgba(248,113,113,.35)', fontWeight: '600' }}>
                          🎯 Traiter les critiques ({dossiersCritiques.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!analyseIA && !analyseErreur && totalRetard > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>Analyse non chargée.</span>
                    <button className="btn bpu" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => lancerAnalyse(undefined, undefined)}>Analyser maintenant</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Situation + actions */}
          {(loyersArisque > 0 || contratsExpirants.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,.06)', borderRadius: '18px', overflow: 'hidden', marginBottom: '24px', border: '1px solid rgba(255,255,255,.06)', ...fi(.14) }}>
              <div style={{ background: '#13131a', padding: '20px 22px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '16px' }}>Situation financière</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {loyersArisque > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '13px', color: '#64748b' }}>💸 Loyers à risque</span><span style={{ fontSize: '18px', fontWeight: '700', color: '#f87171', fontFamily: "'DM Mono',monospace" }}>{loyersArisque.toLocaleString('fr-FR')}€</span></div>}
                  {loyersSecurisables > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '13px', color: '#64748b' }}>💡 Sécurisable &lt;5j</span><span style={{ fontSize: '18px', fontWeight: '700', color: '#34d399', fontFamily: "'DM Mono',monospace" }}>{loyersSecurisables.toLocaleString('fr-FR')}€</span></div>}
                  {contratsExpirants.length > 0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '13px', color: '#64748b' }}>📋 Contrats expirants</span><span style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', fontFamily: "'DM Mono',monospace" }}>{contratsExpirants.length}</span></div>}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button className="fb" onClick={() => activerFiltreRisque('critique')} style={{ color: '#f87171', background: filtreRisque === 'critique' ? 'rgba(248,113,113,.08)' : 'transparent', borderColor: filtreRisque === 'critique' ? 'rgba(248,113,113,.3)' : 'transparent' }}><span style={{ fontSize: '12px' }}>⚠️ Critiques</span><span style={{ fontSize: '14px', fontWeight: '700' }}>{dossiersCritiques.length}</span></button>
                    <button className="fb" onClick={() => activerFiltreRisque('surveiller')} style={{ color: '#fb923c', background: filtreRisque === 'surveiller' ? 'rgba(251,146,60,.08)' : 'transparent', borderColor: filtreRisque === 'surveiller' ? 'rgba(251,146,60,.3)' : 'transparent' }}><span style={{ fontSize: '12px' }}>👁 À surveiller</span><span style={{ fontSize: '14px', fontWeight: '700' }}>{dossiersASurveiller.length}</span></button>
                    {locInhabituels.length > 0 && <button className="fb" onClick={() => activerFiltreRisque('inhabituel')} style={{ color: '#a78bfa', background: filtreRisque === 'inhabituel' ? 'rgba(167,139,250,.08)' : 'transparent', borderColor: filtreRisque === 'inhabituel' ? 'rgba(167,139,250,.3)' : 'transparent' }}><span style={{ fontSize: '12px' }}>⚡ Inhabituels</span><span style={{ fontSize: '14px', fontWeight: '700' }}>{locInhabituels.length}</span></button>}
                  </div>
                </div>
              </div>
              <div style={{ background: '#0f0f13', padding: '20px 22px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '16px' }}>Actions prioritaires</div>
                {recommandations.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(52,211,153,.06)', borderRadius: '10px', border: '1px solid rgba(52,211,153,.12)' }}>
                    <span>✓</span><span style={{ fontSize: '13px', color: '#34d399' }}>Aucune action requise aujourd'hui</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recommandations.map((rec, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,.05)', transition: 'all .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{rec.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.locataire.nom}</div>
                          <div style={{ fontSize: '11px', color: rec.couleur, marginTop: '1px' }}>{rec.message}</div>
                        </div>
                        <button className="btn bgh" style={{ padding: '4px 10px', fontSize: '12px', flexShrink: 0 }} onClick={() => demanderRelance(rec.locataire)}>Envoyer →</button>
                      </div>
                    ))}
                  </div>
                )}
                {contratsExpirants.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {contratsExpirants.slice(0, 2).map(l => {
                      const j = joursAvantExpiration(l.contrat_fin)
                      return (
                        <a key={l.id} href={"/locataires/" + l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(251,146,60,.06)', borderRadius: '10px', border: '1px solid rgba(251,146,60,.1)', textDecoration: 'none', transition: 'all .15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,146,60,.06)'}>
                          <div><div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div><div style={{ fontSize: '11px', color: '#475569' }}>{l.appartement}</div></div>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: j < 0 ? '#f87171' : '#fb923c', background: j < 0 ? 'rgba(248,113,113,.1)' : 'rgba(251,146,60,.1)', padding: '3px 8px', borderRadius: '6px' }}>{j < 0 ? 'Expiré' : 'Dans ' + j + 'j'}</span>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '24px', ...fi(.2) }}>
            {[
              { label: 'Total', value: locataires.length, color: '#e2e8f0', bg: 'rgba(255,255,255,.04)', fn: () => { setOnglet('tous'); setFiltreRisque(null) } },
              { label: 'En retard', value: totalRetard, color: '#f87171', bg: 'rgba(248,113,113,.08)', fn: () => { setOnglet('retard'); setFiltreRisque(null) } },
              { label: 'Payés', value: totalPaye, color: '#34d399', bg: 'rgba(52,211,153,.08)', fn: () => { setOnglet('paye'); setFiltreRisque(null) } },
              { label: 'En attente', value: totalAttente, color: '#fb923c', bg: 'rgba(251,146,60,.08)', fn: () => { setOnglet('attente'); setFiltreRisque(null) } },
              { label: 'Loyers / mois', value: totalLoyers.toLocaleString('fr-FR') + '€', color: '#a78bfa', bg: 'rgba(167,139,250,.08)', fn: null },
            ].map((s, i) => (
              <div key={i} className="sc" style={{ background: s.bg }} onClick={s.fn || undefined}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: s.color, fontFamily: "'DM Mono',monospace", letterSpacing: '-1px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {filtreRisque && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 14px', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: '#a5b4fc' }}>Filtre : {filtreRisque === 'critique' ? '⚠️ Critiques' : filtreRisque === 'surveiller' ? '👁 À surveiller' : '⚡ Inhabituels'}</span>
              <button onClick={() => setFiltreRisque(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>×</button>
            </div>
          )}

          {/* Recherche + onglets */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', ...fi(.25) }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="is" style={{ paddingLeft: '40px' }} placeholder="Rechercher un locataire..." value={recherche} onChange={e => setRecherche(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '4px' }}>
              {[{ id: 'tous', label: 'Tous', count: locataires.length, color: '#94a3b8' }, { id: 'retard', label: 'En retard', count: totalRetard, color: '#f87171' }, { id: 'attente', label: 'En attente', count: totalAttente, color: '#fb923c' }, { id: 'paye', label: 'Payés', count: totalPaye, color: '#34d399' }].map(t => (
                <button key={t.id} className={`tab ${onglet === t.id ? 'on' : 'off'}`} onClick={() => { setOnglet(t.id); setFiltreRisque(null) }}>{t.label} <span style={{ marginLeft: '4px', fontWeight: '700', color: onglet === t.id ? 'rgba(255,255,255,.8)' : t.color }}>{t.count}</span></button>
              ))}
            </div>
            <select value={tri} onChange={e => setTri(e.target.value)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', padding: '8px 12px', color: '#94a3b8', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="retard_desc">Retard ↓</option><option value="nom_asc">Nom A-Z</option><option value="loyer_desc">Loyer ↓</option>
            </select>
          </div>

          {onglet === 'attente' && enAttente.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', padding: '12px 16px', background: 'rgba(255,255,255,.03)', borderRadius: '12px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', flex: 1 }}>{enAttente.length} locataires en attente</span>
              <button className="btn bg" onClick={toutMarquerPaye}>Tout marquer payé</button>
              <button className="btn br" onClick={toutMarquerEnRetard}>Tout en retard</button>
            </div>
          )}

          {/* Liste */}
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,.06)', borderRadius: '16px', overflow: 'hidden', ...fi(.3) }}>
            {listeActive.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: '#334155' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{filtreRisque ? '🔍' : onglet === 'retard' ? '✅' : onglet === 'paye' ? '⏳' : '📋'}</div>
                <div style={{ fontSize: '14px' }}>{filtreRisque ? 'Aucun locataire dans ce filtre' : onglet === 'retard' ? 'Aucun loyer en retard' : onglet === 'paye' ? 'Aucun paiement ce mois-ci' : 'Aucun locataire'}</div>
              </div>
            )}
            {onglet === 'retard' && enRetard.map((l, i) => {
              const j = joursEnRetard(l.date_retard)
              const score = scoreRisque(l)
              const recs = recommandationsIA(l)
              const scoreNum = score?.score
              const scoreColor = scoreNum >= 75 ? '#f87171' : scoreNum >= 55 ? '#f97316' : scoreNum >= 35 ? '#fb923c' : scoreNum ? '#fbbf24' : '#94a3b8'
              const scoreGlow = scoreNum >= 75 ? 'rgba(248,113,113,0.3)' : scoreNum >= 55 ? 'rgba(249,115,22,0.3)' : scoreNum >= 35 ? 'rgba(251,146,60,0.3)' : 'rgba(251,191,36,0.3)'
              return (
                <div key={l.id} className="ri ain" style={{ animationDelay: i * .04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 20px' }}>
                  {/* Avatar + nom */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '160px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: score ? score.bg : 'rgba(248,113,113,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', fontWeight: '700', color: score ? score.color : '#f87171' }}>{l.nom.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{l.appartement}{l.derniere_relance ? ` · relancé il y a ${joursDepuis(l.derniere_relance)}j` : ' · jamais relancé'}</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: '72px' }}>
                    {scoreNum ? (
                      <>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: scoreColor, fontFamily: "'DM Mono',monospace", lineHeight: 1, textShadow: `0 0 12px ${scoreGlow}` }}>{scoreNum}</div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', letterSpacing: '.04em' }}>/ 100</div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: scoreColor, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{score.label}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>—</div>
                        <div style={{ fontSize: '10px', color: '#334155', marginTop: '2px' }}>{score?.label || 'N/A'}</div>
                      </>
                    )}
                  </div>

                  {/* Recommandations */}
                  <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '5px', minWidth: 0, padding: '0 8px' }}>
                    {recs.map((rec, ri) => (
                      <span key={ri} style={{ fontSize: '11px', fontWeight: '600', color: rec.color, background: rec.color + '14', border: `1px solid ${rec.color}28`, borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap' }}>{rec.label}</span>
                    ))}
                  </div>

                  {/* Jours + montant + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: j >= 20 ? '#f87171' : j >= 10 ? '#fb923c' : '#fbbf24', background: j >= 20 ? 'rgba(248,113,113,.1)' : j >= 10 ? 'rgba(251,146,60,.1)' : 'rgba(251,191,36,.1)', borderRadius: '6px', padding: '3px 8px', fontFamily: "'DM Mono',monospace" }}>{j}j</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace", minWidth: '52px', textAlign: 'right' }}>{l.loyer_montant}€</span>
                    <button className="btn bb" onClick={() => demanderRelance(l)}>Relance</button>
                    <button className="btn bg" onClick={() => marquerPaye(l.id, l.nom)}>Payé</button>
                    <a href={"/locataires/" + l.id} className="btn bgh">Voir</a>
                  </div>
                </div>
              )
            })}
            {onglet === 'attente' && enAttente.map((l, i) => (
              <div key={l.id} className="ri ain" style={{ animationDelay: i * .04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251,146,60,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: '#fb923c' }}>{l.nom.charAt(0).toUpperCase()}</div>
                  <div><div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div><div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace" }}>{l.loyer_montant}€</span>
                  <button className="btn bg" onClick={() => marquerPaye(l.id, l.nom)}>Payé</button>
                  <button className="btn br" onClick={() => marquerEnRetard(l.id)}>En retard</button>
                  <a href={"/locataires/" + l.id} className="btn bgh">Voir</a>
                </div>
              </div>
            ))}
            {onglet === 'tous' && tous.map((l, i) => {
              const sc2 = l.statut === 'paye' ? '#34d399' : l.statut === 'en_retard' ? '#f87171' : '#fb923c'
              const sl = l.statut === 'paye' ? 'Payé' : l.statut === 'en_retard' ? joursEnRetard(l.date_retard) + 'j de retard' : 'En attente'
              const score = scoreRisque(l)
              return (
                <div key={l.id} className="ri ain" style={{ animationDelay: i * .04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: sc2 + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: sc2 }}>{l.nom.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}</div>
                      {score && <span style={{ fontSize: '11px', fontWeight: '600', color: score.color, background: score.bg, borderRadius: '4px', padding: '2px 6px', marginTop: '3px', display: 'inline-block' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: score.dot, display: 'inline-block', marginRight: '3px', verticalAlign: 'middle' }} />Risque {score.label}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className="bdg" style={{ background: sc2 + '18', color: sc2 }}>{sl}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace" }}>{l.loyer_montant}€</span>
                    <a href={"/locataires/" + l.id} className="btn bgh">Voir</a>
                  </div>
                </div>
              )
            })}
            {onglet === 'paye' && payes.map((l, i) => {
              const jp = prochainPaiement(l.loyer_echeance), jpc = jp <= 3 ? '#fb923c' : jp <= 7 ? '#fbbf24' : '#34d399'
              return (
                <div key={l.id} className="ri ain" style={{ animationDelay: i * .04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(52,211,153,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: '#34d399' }}>{l.nom.charAt(0).toUpperCase()}</div>
                    <div><div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div><div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}{jp ? ` · Prochain dans ${jp}j` : ''}</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {jp && <span className="bdg" style={{ background: 'rgba(52,211,153,.1)', color: jpc }}>Dans {jp}j</span>}
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace" }}>{l.loyer_montant}€</span>
                    <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>✓ Payé</span>
                    <button className="btn bpu" onClick={() => genererQuittance(l)}>Quittance</button>
                    <button className="btn bgh" onClick={() => marquerEnRetard(l.id)}>Annuler</button>
                    <a href={"/locataires/" + l.id} className="btn bgh">Voir</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ════ MODAL TRAITER TOUT ════ */}
      {showTraiterTout && (
        <div className="mb">
          <div className="mol">
            <div style={{ flexShrink: 0, marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#f1f5f9' }}>⚡ Traiter tous les retards</h2>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>L'IA a choisi le bon template pour chaque dossier · Décochez pour exclure</p>
                </div>
                <button onClick={() => setShowTraiterTout(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '22px', padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.03)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9' }}>{relancesPreview.filter(r => r.selectionne).length}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>relances à envoyer</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(248,113,113,.06)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171' }}>{relancesPreview.filter(r => r.selectionne).reduce((a, r) => a + parseFloat(r.locataire.loyer_montant || 0), 0).toLocaleString('fr-FR')}€</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>couverts</div>
                </div>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {relancesPreview.map((r, i) => {
                const j = joursEnRetard(r.locataire.date_retard), score = scoreRisque(r.locataire), niv = niveauRelance(r.locataire)
                return (
                  <div key={i} className={`rr ${r.selectionne ? '' : 'off'}`} onClick={() => setRelancesPreview(p => p.map((x, xi) => xi === i ? { ...x, selectionne: !x.selectionne } : x))}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${r.selectionne ? '#3b82f6' : '#334155'}`, background: r.selectionne ? '#3b82f6' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                      {r.selectionne && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: score ? score.bg : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: '700', color: score ? score.color : '#94a3b8' }}>{r.locataire.nom.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{r.locataire.nom}</span>
                        <span style={{ fontSize: '11px', color: '#475569' }}>{r.locataire.appartement}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: niv.color, background: niv.bg, borderRadius: '4px', padding: '2px 6px' }}>{r.template.nom}</span>
                        {score && <span style={{ fontSize: '11px', color: score.color }}>· {score.label}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace" }}>{r.locataire.loyer_montant}€</div>
                      <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>{j}j de retard</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexShrink: 0 }}>
              <button className="btn bgh" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setShowTraiterTout(false)}>Annuler</button>
              <button className="btn bm" style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: '14px' }} onClick={envoyerTout} disabled={envoyerEnCours || !relancesPreview.filter(r => r.selectionne).length}>
                {envoyerEnCours ? <><span className="spin">⟳</span> Envoi… {envoyeCount}/{relancesPreview.filter(r => r.selectionne).length}</> : `⚡ Envoyer ${relancesPreview.filter(r => r.selectionne).length} relance${relancesPreview.filter(r => r.selectionne).length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCritiques && (
        <div className="mb"><div className="mol">
          <div style={{ flexShrink: 0, marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: '700', color: '#f1f5f9' }}>🎯 Traiter les dossiers critiques</h2>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Ces relances vont être envoyées immédiatement</p>
              </div>
              <button onClick={() => setConfirmCritiques(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '22px', padding: '0 4px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <div style={{ flex: 1, background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.12)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171' }}>{confirmCritiques.length}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>dossiers critiques</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.03)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9' }}>{confirmCritiques.reduce((a, r) => a + parseFloat(r.locataire.loyer_montant || 0), 0).toLocaleString('fr-FR')}€</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>à recouvrer</div>
              </div>
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {confirmCritiques.map((r, i) => {
              const j = joursEnRetard(r.locataire.date_retard)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: r.score ? r.score.bg : 'rgba(248,113,113,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: '700', color: r.score ? r.score.color : '#f87171' }}>{r.locataire.nom.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{r.locataire.nom}</span>
                      {r.score && <span style={{ fontSize: '11px', fontWeight: '700', color: r.score.color, background: r.score.bg, padding: '1px 7px', borderRadius: '20px' }}>{r.score.label}</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {r.template.nom} · {j}j de retard · {r.locataire.appartement}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{r.locataire.loyer_montant}€</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexShrink: 0 }}>
            <button className="btn bgh" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmCritiques(null)} disabled={envoyerEnCours}>Annuler</button>
            <button className="btn br" style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(248,113,113,.4)' }} onClick={envoyerCritiques} disabled={envoyerEnCours}>
              {envoyerEnCours ? '⟳ Envoi en cours…' : `🎯 Confirmer — envoyer ${confirmCritiques.length} relance${confirmCritiques.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div></div>
      )}

      {confirmation && (
        <div className="mb"><div className="mo">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>Confirmer l'envoi</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Envoyer <span style={{ color: '#60a5fa', fontWeight: '600' }}>"{confirmation.template.nom}"</span> à <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{confirmation.locataire.nom}</span></p>
          <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>{confirmation.jours}j de retard · {confirmation.locataire.appartement}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn bgh" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmation(null)}>Annuler</button>
            <button className="btn bb" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={confirmerRelance}>Envoyer</button>
          </div>
        </div></div>
      )}
      {confirmReinit && (
        <div className="mb"><div className="mo">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>Nouveau mois</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Remettre <span style={{ color: '#fb923c', fontWeight: '600' }}>{totalPaye} locataires</span> en attente ?</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn bgh" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmReinit(false)}>Annuler</button>
            <button className="btn" style={{ flex: 1, justifyContent: 'center', padding: '12px', background: 'rgba(251,146,60,.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,.2)' }} onClick={reinitialiserMois}>Confirmer</button>
          </div>
        </div></div>
      )}
      {showExport && (
        <div className="mb"><div className="mo">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '20px' }}>Exporter</h2>
          <button className="btn bgh" style={{ justifyContent: 'flex-start', padding: '14px 16px', borderRadius: '12px', width: '100%' }} onClick={exporterCSV}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>Export Excel (CSV)</div><div style={{ fontSize: '12px', color: '#475569' }}>{locataires.length} locataires</div></div>
          </button>
          <button className="btn bgh" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '12px' }} onClick={() => setShowExport(false)}>Fermer</button>
        </div></div>
      )}
    </div>
  )
}