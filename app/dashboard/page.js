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
  const j = joursEnRetard(l.date_retard)
  const anciennete = l.contrat_debut ? joursDepuis(l.contrat_debut) : null
  const jamaisRelance = !l.derniere_relance

  if (l.statut !== 'en_retard') return null

  // Pas assez de données
  if (anciennete !== null && anciennete < 60) {
    return { niveau: 'nouveau', label: 'Nouveau', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8', raisons: ['Moins de 2 mois — historique insuffisant'] }
  }

  // Comportement inhabituel : premier retard après long historique propre
  if (jamaisRelance && anciennete !== null && anciennete > 180) {
    return { niveau: 'inhabituel', label: 'Inhabituel ⚡', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', dot: '#a78bfa', raisons: [`Premier retard détecté`, `${Math.floor(anciennete / 30)} mois sans incident`] }
  }

  if (j >= 30) return { niveau: 'critique', label: 'Critique', color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#f87171', raisons: [`${j}j de retard`, 'Mise en demeure urgente'] }
  if (j >= 15) return { niveau: 'eleve', label: 'Élevé', color: '#f87171', bg: 'rgba(248,113,113,0.08)', dot: '#f87171', raisons: [`${j}j de retard`, 'Action immédiate requise'] }
  if (j >= 7)  return { niveau: 'moyen', label: 'Moyen', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', dot: '#fb923c', raisons: [`${j}j de retard`, 'Surveillance active'] }
  return { niveau: 'faible', label: 'Faible', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', dot: '#fbbf24', raisons: [`${j}j de retard`, 'Relance préventive conseillée'] }
}

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [locataires, setLocataires] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState('retard')
  const [confirmation, setConfirmation] = useState(null)
  const [confirmReinit, setConfirmReinit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tri, setTri] = useState('retard_desc')
  const [showExport, setShowExport] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [bandeauOuvert, setBandeauOuvert] = useState(true)

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

  async function deconnexion() { await supabase.auth.signOut(); router.push('/login') }

  async function reinitialiserMois() {
    await supabase.from('locataires').update({ statut: 'en_attente' }).eq('statut', 'paye')
    setLocataires(l => l.map(x => x.statut === 'paye' ? { ...x, statut: 'en_attente' } : x))
    setConfirmReinit(false); setOnglet('attente')
    toast('Nouveau mois initialise', 'info')
  }

  async function marquerPaye(id, nom) {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', id)
    setLocataires(l => l.map(x => x.id === id ? { ...x, statut: 'paye', date_retard: null } : x))
    toast(nom + ' marque comme paye', 'success')
  }

  async function marquerEnRetard(id) {
    const jours = prompt("Depuis combien de jours ? (0 = aujourd'hui)")
    if (jours === null) return
    const date = new Date(); date.setDate(date.getDate() - parseInt(jours || 0))
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: date.toISOString() }).eq('id', id)
    setLocataires(l => l.map(x => x.id === id ? { ...x, statut: 'en_retard', date_retard: date.toISOString() } : x))
    toast('Locataire passe en retard', 'warning')
  }

  async function toutMarquerPaye() {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('statut', 'en_attente')
    setLocataires(l => l.map(x => x.statut === 'en_attente' ? { ...x, statut: 'paye', date_retard: null } : x))
    setOnglet('paye'); toast('Tous marques comme payes', 'success')
  }

  async function toutMarquerEnRetard() {
    const date = new Date().toISOString()
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: date }).eq('statut', 'en_attente')
    setLocataires(l => l.map(x => x.statut === 'en_attente' ? { ...x, statut: 'en_retard', date_retard: date } : x))
    setOnglet('retard'); toast('Tous passes en retard', 'warning')
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
    const corps = template.corps
      .replace(/{nom}/g, locataire.nom)
      .replace(/{montant}/g, locataire.loyer_montant)
      .replace(/{appartement}/g, locataire.appartement)
    const sujet = template.sujet
      .replace(/{nom}/g, locataire.nom)
      .replace(/{montant}/g, locataire.loyer_montant)
      .replace(/{appartement}/g, locataire.appartement)
    const res = await fetch('/api/relance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: locataire.nom, email: locataire.email, sujet, corps: corps.split('\n').join('<br/>'), locataire_id: locataire.id, template_nom: template.nom })
    })
    if (res.ok) toast('Relance envoyee a ' + locataire.nom, 'success')
    else toast('Erreur lors de l\'envoi', 'error')
    setLocataires(l => l.map(x => x.id === locataire.id ? { ...x, derniere_relance: new Date().toISOString() } : x))
  }

  function genererQuittance(locataire) {
    const now = new Date()
    const mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const moisC = mois.charAt(0).toUpperCase() + mois.slice(1)
    const dateAuj = now.toLocaleDateString('fr-FR')
    const debut = '01/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear()
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('fr-FR')
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Quittance - ${locataire.nom}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1a1a1a;padding:60px;max-width:800px;margin:0 auto}.h{border-bottom:3px solid #2563eb;padding-bottom:24px;margin-bottom:32px;display:flex;justify-content:space-between}.logo{font-size:26px;font-weight:bold;color:#2563eb}.ib{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px}.ir{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px}.ir:last-child{border-bottom:none}.mb{background:#2563eb;color:white;border-radius:10px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin:20px 0}.mv{font-size:32px;font-weight:bold}.dec{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;font-size:13px;line-height:1.7;color:#166534}.sl{width:200px;border-bottom:2px solid #1a1a1a;height:60px;margin-bottom:8px}.ft{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}</style></head><body><div class="h"><div><div class="logo">${nomAgence || 'GestImmo'}</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:bold">Quittance de loyer</div><div style="font-size:14px;color:#6b7280;margin-top:4px">${moisC}</div></div></div><div class="ib"><div class="ir"><span style="color:#6b7280">Nom</span><strong>${locataire.nom}</strong></div><div class="ir"><span style="color:#6b7280">Logement</span><strong>${locataire.appartement}</strong></div></div><div class="ib"><div class="ir"><span style="color:#6b7280">Du</span><strong>${debut}</strong></div><div class="ir"><span style="color:#6b7280">Au</span><strong>${fin}</strong></div><div class="ir"><span style="color:#6b7280">Emis le</span><strong>${dateAuj}</strong></div></div><div class="mb"><span>Loyer mensuel</span><span class="mv">${locataire.loyer_montant} €</span></div><div class="dec">Je soussigne(e), <strong>${nomAgence || 'le gestionnaire'}</strong>, declare avoir recu de <strong>${locataire.nom}</strong> la somme de <strong>${locataire.loyer_montant} euros</strong> au titre du loyer du mois de <strong>${moisC}</strong>.</div><div style="display:flex;justify-content:flex-end;margin-top:40px"><div style="text-align:center"><div class="sl"></div><div style="font-size:12px;color:#6b7280">Signature</div></div></div><div class="ft">Document genere par GestImmo &bull; ${dateAuj}</div><script>window.onload=function(){window.print()}<\/script></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'quittance_' + locataire.nom.replace(/ /g, '_') + '.html'
    a.click(); URL.revokeObjectURL(url)
    toast('Quittance generee', 'success')
  }

  function exporterCSV() {
    const headers = ['Nom', 'Email', 'Telephone', 'Appartement', 'Loyer', 'Statut']
    const rows = locataires.map(l => [l.nom, l.email || '', l.telephone || '', l.appartement, l.loyer_montant, l.statut])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'locataires.csv'; a.click(); URL.revokeObjectURL(url)
    setShowExport(false); toast('Export CSV telecharge', 'success')
  }

  function filtrer(liste) {
    if (!recherche) return [...liste].sort((a, b) => {
      if (tri === 'retard_desc') return joursEnRetard(b.date_retard) - joursEnRetard(a.date_retard)
      if (tri === 'nom_asc') return a.nom.localeCompare(b.nom)
      if (tri === 'loyer_desc') return b.loyer_montant - a.loyer_montant
      return 0
    })
    const q = recherche.toLowerCase()
    return liste.filter(l => l.nom.toLowerCase().includes(q) || l.appartement.toLowerCase().includes(q) || (l.email && l.email.toLowerCase().includes(q)))
  }

  const enRetard = filtrer(locataires.filter(l => l.statut === 'en_retard'))
  const payes = filtrer(locataires.filter(l => l.statut === 'paye'))
  const enAttente = filtrer(locataires.filter(l => l.statut === 'en_attente'))
  const totalRetard = locataires.filter(l => l.statut === 'en_retard').length
  const totalPaye = locataires.filter(l => l.statut === 'paye').length
  const totalAttente = locataires.filter(l => l.statut === 'en_attente').length
  const totalLoyers = locataires.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const contratsExpirants = locataires.filter(l => { const j = joursAvantExpiration(l.contrat_fin); return j !== null && j <= 90 })

  // Impact financier
  const loyersArisque = locataires.filter(l => l.statut === 'en_retard').reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const loyersSecurisables = locataires.filter(l => l.statut === 'en_retard' && joursEnRetard(l.date_retard) < 15).reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)

  // Dossiers critiques / à surveiller / normaux
  const dossiersCritiques = locataires.filter(l => { const s = scoreRisque(l); return s && (s.niveau === 'critique' || s.niveau === 'eleve') }).length
  const dossiersASurveiller = locataires.filter(l => { const s = scoreRisque(l); return s && (s.niveau === 'moyen' || s.niveau === 'inhabituel') }).length
  const dossiersNormaux = locataires.length - dossiersCritiques - dossiersASurveiller

  function getRecommandations() {
    const recs = []
    locataires.filter(l => l.statut === 'en_retard').forEach(l => {
      const j = joursEnRetard(l.date_retard)
      const derniereRelance = joursDepuis(l.derniere_relance)
      if (j >= 21) recs.push({ locataire: l, jours: j, message: `Mise en demeure — ${j}j de retard`, action: 'Niveau 3', couleur: '#f87171', icon: '🚨' })
      else if (j >= 8 && (derniereRelance === null || derniereRelance >= 7)) recs.push({ locataire: l, jours: j, message: `Relance ferme — ${j}j de retard`, action: 'Niveau 2', couleur: '#fb923c', icon: '⚠️' })
      else if (j >= 1 && derniereRelance === null) recs.push({ locataire: l, jours: j, message: `Premier rappel — ${j}j, aucune relance`, action: 'Niveau 1', couleur: '#fbbf24', icon: '💬' })
    })
    return recs.sort((a, b) => b.jours - a.jours).slice(0, 5)
  }

  function niveauRelance(l) {
    const j = joursEnRetard(l.date_retard)
    if (j >= 21) return { label: 'Niveau 3 · Mise en demeure', color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
    if (j >= 8) return { label: 'Niveau 2 · Relance ferme', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' }
    return { label: 'Niveau 1 · Premier rappel', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' }
  }

  const recommandations = getRecommandations()
  const totalAlertes = recommandations.length + contratsExpirants.length
  const tous = filtrer(locataires)
  const listeActive = onglet === 'retard' ? enRetard : onglet === 'paye' ? payes : onglet === 'attente' ? enAttente : tous

  // Locataires à comportement inhabituel
  const locInhabituels = locataires.filter(l => { const s = scoreRisque(l); return s && s.niveau === 'inhabituel' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes pulse-bar { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }`}</style>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 0.15, 0.3].map((d, i) => <div key={i} style={{ width: '6px', height: '32px', background: '#3b82f6', borderRadius: '3px', animation: `pulse-bar 0.9s ease-in-out ${d}s infinite` }} />)}
      </div>
    </div>
  )

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`
  })

  const statCards = [
    { label: 'Total locataires', value: locataires.length, color: '#e2e8f0', bg: 'rgba(255,255,255,0.04)', onClick: () => setOnglet('tous') },
    { label: 'En retard', value: totalRetard, color: '#f87171', bg: 'rgba(248,113,113,0.08)', onClick: () => setOnglet('retard') },
    { label: 'Payes', value: totalPaye, color: '#34d399', bg: 'rgba(52,211,153,0.08)', onClick: () => setOnglet('paye') },
    { label: 'En attente', value: totalAttente, color: '#fb923c', bg: 'rgba(251,146,60,0.08)', onClick: () => setOnglet('attente') },
    { label: 'Loyers / mois', value: totalLoyers.toLocaleString('fr-FR') + '€', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', onClick: null },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1a1a24; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #94a3b8; text-decoration: none; transition: all 0.2s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .nav-link.active { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .nav-link.ai-btn { background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15)); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); }
        .nav-link.ai-btn:hover { background: linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.25)); color: #c4b5fd; }
        .stat-card { border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; }
        .stat-card.clickable { cursor: pointer; } .stat-card.clickable:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.12); }
        .row-item { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s; }
        .row-item:last-child { border-bottom: none; } .row-item:hover { background: rgba(255,255,255,0.03); }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s; text-decoration: none; font-family: inherit; }
        .btn:hover { transform: translateY(-1px); } .btn:active { transform: translateY(0); }
        .btn-blue { background: #2563eb; color: white; } .btn-blue:hover { background: #1d4ed8; }
        .btn-green { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
        .btn-red { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
        .btn-ghost { background: rgba(255,255,255,0.06); color: #94a3b8; }
        .btn-purple { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .tab { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .tab.active { background: #2563eb; color: white; } .tab.inactive { background: transparent; color: #64748b; } .tab.inactive:hover { color: #94a3b8; background: rgba(255,255,255,0.04); }
        .input-search { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px; color: #e2e8f0; font-size: 14px; outline: none; width: 100%; transition: all 0.2s; font-family: inherit; }
        .input-search:focus { border-color: rgba(59,130,246,0.4); background: rgba(255,255,255,0.07); }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; backdrop-filter: blur(4px); }
        .modal { background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; max-width: 440px; width: 100%; }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        .animate-in { animation: fadeInUp 0.4s ease forwards; opacity: 0; }
        @keyframes slideDown { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }
        .slide-down { animation: slideDown 0.2s ease forwards; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar */}
        <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px' }}>
            <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>GestImmo</div>
              {nomAgence && <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>{nomAgence}</div>}
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '0.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Navigation</div>
          <button className="nav-link active">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </button>
          <a href="/stats" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Statistiques</a>
          <a href="/historique" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Historique</a>
          <a href="/locataires/nouveau" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nouveau locataire</a>
          <div style={{ margin: '8px 0' }}>
            <a href="/agent" className="nav-link ai-btn" style={{ position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
              Assistant IA
              {recommandations.length > 0 && <span style={{ marginLeft: 'auto', background: '#7c3aed', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>{recommandations.length}</span>}
            </a>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', letterSpacing: '0.08em', padding: '0 14px', marginBottom: '4px', textTransform: 'uppercase' }}>Parametres</div>
          <a href="/membres" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Équipe</a>
          <a href="/parametres" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Parametres</a>
          <a href="/import" className="nav-link"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Importer CSV</a>
          <button className="nav-link" onClick={() => setShowExport(true)}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exporter</button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />
          <button className="nav-link" onClick={deconnexion} style={{ color: '#f87171' }}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Deconnexion</button>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', ...fadeIn(0.05) }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Dashboard</h1>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmReinit(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Nouveau mois
              </button>
              <a href="/locataires/nouveau" className="btn btn-blue">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouveau locataire
              </a>
            </div>
          </div>

          {/* ── RÉSUMÉ DU JOUR ── */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', ...fadeIn(0.1) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '16px' }}>🧠</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Résumé du jour</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
              {totalRetard > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}><strong style={{ color: '#f87171' }}>{totalRetard}</strong> loyer{totalRetard > 1 ? 's' : ''} en retard</span>
                </div>
              )}
              {loyersArisque > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fb923c', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}><strong style={{ color: '#fb923c' }}>{loyersArisque.toLocaleString('fr-FR')}€</strong> à risque</span>
                </div>
              )}
              {dossiersCritiques > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}><strong style={{ color: '#f87171' }}>{dossiersCritiques}</strong> dossier{dossiersCritiques > 1 ? 's' : ''} critique{dossiersCritiques > 1 ? 's' : ''}</span>
                </div>
              )}
              {contratsExpirants.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}><strong style={{ color: '#fbbf24' }}>{contratsExpirants.length}</strong> contrat{contratsExpirants.length > 1 ? 's' : ''} expirant{contratsExpirants.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {locInhabituels.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}><strong style={{ color: '#a78bfa' }}>{locInhabituels.length}</strong> comportement{locInhabituels.length > 1 ? 's' : ''} inhabituel{locInhabituels.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {totalRetard === 0 && dossiersCritiques === 0 && contratsExpirants.length === 0 && (
                <span style={{ fontSize: '13px', color: '#34d399' }}>✓ Tout est en ordre aujourd'hui</span>
              )}
            </div>
          </div>

          {/* ── IMPACT FINANCIER ── */}
          {loyersArisque > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px', ...fadeIn(0.12) }}>
              <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>💸 Loyers à risque</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#f87171', fontFamily: "'DM Mono', monospace" }}>{loyersArisque.toLocaleString('fr-FR')}€</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{totalRetard} locataire{totalRetard > 1 ? 's' : ''} en retard</div>
              </div>
              <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>💡 Sécurisable sous 5j</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#34d399', fontFamily: "'DM Mono', monospace" }}>{loyersSecurisables.toLocaleString('fr-FR')}€</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Retards récents — action rapide possible</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Priorisation dossiers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#f87171' }}>⚠️ Critiques</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>{dossiersCritiques}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#fb923c' }}>👁 À surveiller</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fb923c' }}>{dossiersASurveiller}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#34d399' }}>✓ Normaux</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#34d399' }}>{dossiersNormaux}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bandeau alertes IA */}
          {totalAlertes > 0 && (
            <div style={{ marginBottom: '20px', ...fadeIn(0.15) }}>
              <button onClick={() => setBandeauOuvert(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: bandeauOuvert ? '14px 14px 0 0' : '14px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  {recommandations.length > 0 && <span style={{ background: 'rgba(124,58,237,0.15)', color: '#a5b4fc', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>🤖 {recommandations.length} action{recommandations.length > 1 ? 's' : ''} IA</span>}
                  {contratsExpirants.length > 0 && <span style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>⚠️ {contratsExpirants.length} contrat{contratsExpirants.length > 1 ? 's' : ''} expirant{contratsExpirants.length > 1 ? 's' : ''}</span>}
                </div>
                <span style={{ color: '#475569', fontSize: '12px', display: 'inline-block', transform: bandeauOuvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                <button onClick={e => { e.stopPropagation(); setBandeauOuvert(false) }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 7px', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}>×</button>
              </button>
              {bandeauOuvert && (
                <div className="slide-down" style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                  {recommandations.length > 0 && (
                    <div style={{ padding: '16px 18px', borderBottom: contratsExpirants.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Recommandations IA</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recommandations.map((rec, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{rec.icon}</span>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: rec.couleur }}>{rec.locataire.nom}</span>
                              <span style={{ fontSize: '12px', color: '#475569' }}>{rec.message}</span>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => demanderRelance(rec.locataire)}>Envoyer →</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {contratsExpirants.length > 0 && (
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Contrats expirants</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {contratsExpirants.map(l => {
                          const j = joursAvantExpiration(l.contrat_fin)
                          return (
                            <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</span>
                                <span style={{ fontSize: '12px', color: '#475569' }}>{l.appartement}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="badge" style={{ background: j < 0 ? 'rgba(248,113,113,0.15)' : 'rgba(251,146,60,0.15)', color: j < 0 ? '#f87171' : '#fb923c' }}>{j < 0 ? 'Expiré depuis ' + Math.abs(j) + 'j' : 'Dans ' + j + 'j'}</span>
                                <a href={"/locataires/" + l.id} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>Voir</a>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px', ...fadeIn(0.2) }}>
            {statCards.map((s, i) => (
              <div key={i} className={`stat-card ${s.onClick ? 'clickable' : ''}`} style={{ background: s.bg }} onClick={s.onClick || undefined}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: s.color, fontFamily: "'DM Mono', monospace", letterSpacing: '-1px' }}>{s.value}</div>
                {s.onClick && <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px' }}>Voir →</div>}
              </div>
            ))}
          </div>

          {/* Recherche + onglets */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', ...fadeIn(0.25) }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="input-search" style={{ paddingLeft: '40px' }} placeholder="Rechercher un locataire..." value={recherche} onChange={e => setRecherche(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
              {[
                { id: 'tous', label: 'Tous', count: locataires.length, color: '#94a3b8' },
                { id: 'retard', label: 'En retard', count: totalRetard, color: '#f87171' },
                { id: 'attente', label: 'En attente', count: totalAttente, color: '#fb923c' },
                { id: 'paye', label: 'Payes', count: totalPaye, color: '#34d399' },
              ].map(t => (
                <button key={t.id} className={`tab ${onglet === t.id ? 'active' : 'inactive'}`} onClick={() => setOnglet(t.id)}>
                  {t.label} <span style={{ marginLeft: '4px', fontWeight: '700', color: onglet === t.id ? 'rgba(255,255,255,0.8)' : t.color }}>{t.count}</span>
                </button>
              ))}
            </div>
            <select value={tri} onChange={e => setTri(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: '#94a3b8', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="retard_desc">Retard ↓</option>
              <option value="nom_asc">Nom A-Z</option>
              <option value="loyer_desc">Loyer ↓</option>
            </select>
          </div>

          {onglet === 'attente' && enAttente.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', flex: 1 }}>{enAttente.length} locataires en attente</span>
              <button className="btn btn-green" onClick={toutMarquerPaye}>Tout marquer paye</button>
              <button className="btn btn-red" onClick={toutMarquerEnRetard}>Tout en retard</button>
            </div>
          )}

          {/* Liste */}
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', ...fadeIn(0.3) }}>
            {listeActive.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: '#334155' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{onglet === 'retard' ? '✅' : onglet === 'paye' ? '⏳' : '📋'}</div>
                <div style={{ fontSize: '14px' }}>{onglet === 'retard' ? 'Aucun loyer en retard' : onglet === 'paye' ? 'Aucun paiement ce mois-ci' : 'Aucun locataire'}</div>
              </div>
            )}

            {onglet === 'retard' && enRetard.map((l, i) => {
              const j = joursEnRetard(l.date_retard)
              const badgeColor = j >= 20 ? '#f87171' : j >= 10 ? '#fb923c' : j >= 5 ? '#fbbf24' : '#94a3b8'
              const badgeBg = j >= 20 ? 'rgba(248,113,113,0.12)' : j >= 10 ? 'rgba(251,146,60,0.12)' : j >= 5 ? 'rgba(251,191,36,0.12)' : 'rgba(148,163,184,0.1)'
              const score = scoreRisque(l)
              return (
                <div key={l.id} className="row-item animate-in" style={{ animationDelay: i * 0.04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: '#f87171' }}>
                      {l.nom.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}{l.derniere_relance ? ` · Relance il y a ${joursDepuis(l.derniere_relance)}j` : ''}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: niveauRelance(l).color, background: niveauRelance(l).bg, borderRadius: '4px', padding: '2px 6px' }}>
                          🤖 {niveauRelance(l).label}
                        </span>
                        {score && (
                          <span style={{ fontSize: '11px', fontWeight: '600', color: score.color, background: score.bg, borderRadius: '4px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: score.dot, display: 'inline-block' }} />
                            Risque {score.label}
                            {score.raisons[1] && <span style={{ color: score.color, opacity: 0.7 }}>· {score.raisons[1]}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span className="badge" style={{ background: badgeBg, color: badgeColor }}>{j}j</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>{l.loyer_montant}€</span>
                    <button className="btn btn-blue" onClick={() => demanderRelance(l)}>Relance</button>
                    <button className="btn btn-green" onClick={() => marquerPaye(l.id, l.nom)}>Paye</button>
                    <a href={"/locataires/" + l.id} className="btn btn-ghost">Voir</a>
                  </div>
                </div>
              )
            })}

            {onglet === 'attente' && enAttente.map((l, i) => (
              <div key={l.id} className="row-item animate-in" style={{ animationDelay: i * 0.04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251,146,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: '#fb923c' }}>{l.nom.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>{l.loyer_montant}€</span>
                  <button className="btn btn-green" onClick={() => marquerPaye(l.id, l.nom)}>Paye</button>
                  <button className="btn btn-red" onClick={() => marquerEnRetard(l.id)}>En retard</button>
                  <a href={"/locataires/" + l.id} className="btn btn-ghost">Voir</a>
                </div>
              </div>
            ))}

            {onglet === 'tous' && tous.map((l, i) => {
              const statutColor = l.statut === 'paye' ? '#34d399' : l.statut === 'en_retard' ? '#f87171' : '#fb923c'
              const statutLabel = l.statut === 'paye' ? 'Payé' : l.statut === 'en_retard' ? joursEnRetard(l.date_retard) + 'j de retard' : 'En attente'
              const score = scoreRisque(l)
              return (
                <div key={l.id} className="row-item animate-in" style={{ animationDelay: i * 0.04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: statutColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: statutColor }}>{l.nom.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}</div>
                      {score && <span style={{ fontSize: '11px', fontWeight: '600', color: score.color, background: score.bg, borderRadius: '4px', padding: '2px 6px', marginTop: '3px', display: 'inline-block' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: score.dot, display: 'inline-block', marginRight: '3px', verticalAlign: 'middle' }} />Risque {score.label}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span className="badge" style={{ background: statutColor + '18', color: statutColor }}>{statutLabel}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>{l.loyer_montant}€</span>
                    <a href={"/locataires/" + l.id} className="btn btn-ghost">Voir</a>
                  </div>
                </div>
              )
            })}

            {onglet === 'paye' && payes.map((l, i) => {
              const jp = prochainPaiement(l.loyer_echeance)
              const jpColor = jp <= 3 ? '#fb923c' : jp <= 7 ? '#fbbf24' : '#34d399'
              return (
                <div key={l.id} className="row-item animate-in" style={{ animationDelay: i * 0.04 + 's', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: '#34d399' }}>{l.nom.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.nom}</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{l.appartement}{jp ? ` · Prochain dans ${jp}j` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {jp && <span className="badge" style={{ background: 'rgba(52,211,153,0.1)', color: jpColor }}>Dans {jp}j</span>}
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>{l.loyer_montant}€</span>
                    <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>✓ Paye</span>
                    <button className="btn btn-purple" onClick={() => genererQuittance(l)}>Quittance</button>
                    <button className="btn btn-ghost" onClick={() => marquerEnRetard(l.id)}>Annuler</button>
                    <a href={"/locataires/" + l.id} className="btn btn-ghost">Voir</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {confirmation && (
        <div className="modal-bg">
          <div className="modal">
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>Confirmer l'envoi</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Envoyer <span style={{ color: '#60a5fa', fontWeight: '600' }}>"{confirmation.template.nom}"</span> à <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{confirmation.locataire.nom}</span></p>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>{confirmation.jours}j de retard · {confirmation.locataire.appartement}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmation(null)}>Annuler</button>
              <button className="btn btn-blue" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={confirmerRelance}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
      {confirmReinit && (
        <div className="modal-bg">
          <div className="modal">
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' }}>Nouveau mois</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Remettre <span style={{ color: '#fb923c', fontWeight: '600' }}>{totalPaye} locataires</span> en attente ?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} onClick={() => setConfirmReinit(false)}>Annuler</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', padding: '12px', background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)' }} onClick={reinitialiserMois}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {showExport && (
        <div className="modal-bg">
          <div className="modal">
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '20px' }}>Exporter</h2>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '14px 16px', borderRadius: '12px', width: '100%' }} onClick={exporterCSV}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>Export Excel (CSV)</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>{locataires.length} locataires</div>
              </div>
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '12px' }} onClick={() => setShowExport(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}