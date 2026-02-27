'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import Logo from '../logo'

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  const debut = new Date(dateRetard)
  const aujourd_hui = new Date()
  const diff = aujourd_hui - debut
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function joursDepuis(date) {
  if (!date) return null
  const d = new Date(date)
  const diff = new Date() - d
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function prochainPaiement(echeance) {
  if (!echeance) return null
  const aujourd_hui = new Date()
  const jourDuMois = aujourd_hui.getDate()
  const mois = aujourd_hui.getMonth()
  const annee = aujourd_hui.getFullYear()
  if (jourDuMois < echeance) {
    return echeance - jourDuMois
  } else {
    const joursRestantsMois = new Date(annee, mois + 1, 0).getDate() - jourDuMois
    return joursRestantsMois + echeance
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [locataires, setLocataires] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState('retard')
  const [confirmation, setConfirmation] = useState(null)
  const [confirmReinit, setConfirmReinit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tri, setTri] = useState('retard_desc')
  const [filtreMinLoyer, setFiltreMinLoyer] = useState('')
  const [filtreMaxLoyer, setFiltreMaxLoyer] = useState('')
  const [filtreMinJours, setFiltreMinJours] = useState('')
  const [showFiltres, setShowFiltres] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: locs } = await supabase.from('locataires').select('*')
      setLocataires(locs || [])
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) setNomAgence(agence.nom)
      setLoading(false)
    }
    init()
  }, [])

  async function deconnexion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function reinitialiserMois() {
    await supabase.from('locataires').update({ statut: 'en_attente' }).eq('statut', 'paye')
    setLocataires(locataires.map(l => l.statut === 'paye' ? { ...l, statut: 'en_attente' } : l))
    setConfirmReinit(false)
    setOnglet('attente')
  }

  async function toutMarquerPaye() {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('statut', 'en_attente')
    setLocataires(locataires.map(l => l.statut === 'en_attente' ? { ...l, statut: 'paye', date_retard: null } : l))
    setOnglet('paye')
  }

  async function toutMarquerEnRetard() {
    const date = new Date().toISOString()
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: date }).eq('statut', 'en_attente')
    setLocataires(locataires.map(l => l.statut === 'en_attente' ? { ...l, statut: 'en_retard', date_retard: date } : l))
    setOnglet('retard')
  }

  function exporterCSV(liste, nom) {
    const headers = ['Nom', 'Email', 'Téléphone', 'Appartement', 'Loyer (€)', 'Statut', 'Jours de retard']
    const rows = liste.map(l => [l.nom, l.email || '', l.telephone || '', l.appartement, l.loyer_montant, l.statut, joursEnRetard(l.date_retard) || ''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nom + '_' + new Date().toLocaleDateString('fr-FR').replace(/\//g, '-') + '.csv'
    a.click()
    URL.revokeObjectURL(url)
    setShowExport(false)
  }

  function exporterPDF(liste, titre) {
    const date = new Date().toLocaleDateString('fr-FR')
    const rows = liste.map(l => `<tr><td>${l.nom}</td><td>${l.appartement}</td><td>${l.loyer_montant}€</td><td>${joursEnRetard(l.date_retard) > 0 ? joursEnRetard(l.date_retard) + 'j' : '-'}</td><td>${l.email || '-'}</td><td>${l.telephone || '-'}</td></tr>`).join('')
    const html = `<html><head><meta charset="utf-8"><title>${titre}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h1{font-size:22px;margin-bottom:4px}p{color:#888;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f1f5f9;padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e2e8f0}td{padding:9px 12px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#fafafa}.footer{margin-top:30px;font-size:11px;color:#aaa;text-align:right}</style></head><body><h1>${titre}</h1><p>${nomAgence} · Généré le ${date} · ${liste.length} locataire${liste.length > 1 ? 's' : ''}</p><table><thead><tr><th>Nom</th><th>Appartement</th><th>Loyer</th><th>Retard</th><th>Email</th><th>Téléphone</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">GestImmo · ${nomAgence}</div></body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
    setShowExport(false)
  }

  function filtrerEtTrier(liste) {
    let result = [...liste]
    if (recherche) {
      const q = recherche.toLowerCase()
      result = result.filter(l => l.nom.toLowerCase().includes(q) || l.appartement.toLowerCase().includes(q) || (l.email && l.email.toLowerCase().includes(q)))
    }
    if (filtreMinLoyer) result = result.filter(l => l.loyer_montant >= parseInt(filtreMinLoyer))
    if (filtreMaxLoyer) result = result.filter(l => l.loyer_montant <= parseInt(filtreMaxLoyer))
    if (filtreMinJours) result = result.filter(l => joursEnRetard(l.date_retard) >= parseInt(filtreMinJours))
    if (tri === 'retard_desc') result.sort((a, b) => joursEnRetard(b.date_retard) - joursEnRetard(a.date_retard))
    if (tri === 'retard_asc') result.sort((a, b) => joursEnRetard(a.date_retard) - joursEnRetard(b.date_retard))
    if (tri === 'nom_asc') result.sort((a, b) => a.nom.localeCompare(b.nom))
    if (tri === 'nom_desc') result.sort((a, b) => b.nom.localeCompare(a.nom))
    if (tri === 'loyer_desc') result.sort((a, b) => b.loyer_montant - a.loyer_montant)
    if (tri === 'loyer_asc') result.sort((a, b) => a.loyer_montant - b.loyer_montant)
    return result
  }

  const enRetard = filtrerEtTrier(locataires.filter(l => l.statut === 'en_retard'))
  const payes = filtrerEtTrier(locataires.filter(l => l.statut === 'paye'))
  const enAttente = filtrerEtTrier(locataires.filter(l => l.statut === 'en_attente'))

  const totalRetard = locataires.filter(l => l.statut === 'en_retard').length
  const totalPaye = locataires.filter(l => l.statut === 'paye').length
  const totalAttente = locataires.filter(l => l.statut === 'en_attente').length
  const filtresActifs = filtreMinLoyer || filtreMaxLoyer || filtreMinJours

  function resetFiltres() { setFiltreMinLoyer(''); setFiltreMaxLoyer(''); setFiltreMinJours('') }

  async function marquerPaye(id) {
    await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', id)
    setLocataires(locataires.map(l => l.id === id ? { ...l, statut: 'paye', date_retard: null } : l))
  }

  async function marquerEnRetard(id) {
    const jours = prompt("Depuis combien de jours est-il en retard ? (0 si ca commence aujourd'hui)")
    if (jours === null) return
    const date = new Date()
    date.setDate(date.getDate() - parseInt(jours || 0))
    const dateRetard = date.toISOString()
    await supabase.from('locataires').update({ statut: 'en_retard', date_retard: dateRetard }).eq('id', id)
    setLocataires(locataires.map(l => l.id === id ? { ...l, statut: 'en_retard', date_retard: dateRetard } : l))
  }

  async function demanderRelance(locataire) {
    const jours = joursEnRetard(locataire.date_retard)
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const template = templates.find(t => jours >= t.jours_min && (t.jours_max === null || jours <= t.jours_max))
    if (!template) { alert('Aucun template trouvé pour ' + jours + ' jours de retard.'); return }
    setConfirmation({ locataire, template, jours })
  }

  async function confirmerRelance() {
    const { locataire, template } = confirmation
    setConfirmation(null)
    const corps = template.corps.split('\\n').join('<br/>').split('\n').join('<br/>').replace(/{nom}/g, locataire.nom).replace(/{montant}/g, locataire.loyer_montant).replace(/{appartement}/g, locataire.appartement)
    const sujet = template.sujet.replace(/{nom}/g, locataire.nom).replace(/{montant}/g, locataire.loyer_montant).replace(/{appartement}/g, locataire.appartement)
    await fetch('/api/relance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: locataire.nom, email: locataire.email, sujet, corps, locataire_id: locataire.id, template_nom: template.nom }) })
    const now = new Date().toISOString()
    setLocataires(locataires.map(l => l.id === locataire.id ? { ...l, derniere_relance: now } : l))
  }

  function badgeRetard(jours) {
    if (jours >= 20) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">{jours}j de retard</span>
    if (jours >= 10) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">{jours}j de retard</span>
    if (jours >= 5) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">{jours}j de retard</span>
    return <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{jours}j de retard</span>
  }

  function badgeProchainPaiement(jours) {
    if (jours <= 3) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600">Dans {jours}j</span>
    if (jours <= 7) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">Dans {jours}j</span>
    return <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-600">Dans {jours}j</span>
  }

  const onglets = [
    { id: 'retard', label: 'En retard', count: totalRetard, color: 'text-red-500' },
    { id: 'attente', label: 'En attente', count: totalAttente, color: 'text-orange-400' },
    { id: 'paye', label: 'Payés', count: totalPaye, color: 'text-green-500' },
  ]

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">

      {confirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Confirmer l'envoi</h2>
            <p className="text-gray-600 mb-1">Vous allez envoyer <span className="font-semibold text-blue-600">"{confirmation.template.nom}"</span> à <span className="font-semibold">{confirmation.locataire.nom}</span>.</p>
            <p className="text-sm text-gray-400 mb-5">{confirmation.jours} jour{confirmation.jours > 1 ? 's' : ''} de retard · {confirmation.locataire.appartement}</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="text-xs text-gray-500 font-medium mb-1">Sujet : {confirmation.template.sujet}</p>
              <p className="text-xs text-gray-400 whitespace-pre-line">{confirmation.template.corps.substring(0, 120)}...</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmation(null)} className="flex-1 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-medium hover:bg-gray-200">Annuler</button>
              <button onClick={confirmerRelance} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700">Envoyer ✉</button>
            </div>
          </div>
        </div>
      )}

      {confirmReinit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Nouveau mois</h2>
            <p className="text-gray-600 mb-2">Vous allez remettre <span className="font-semibold text-orange-600">{totalPaye} locataires</span> de "Payé" à "En attente".</p>
            <p className="text-sm text-gray-400 mb-5">Cette action est irréversible. À faire en début de mois uniquement.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReinit(false)} className="flex-1 bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-medium hover:bg-gray-200">Annuler</button>
              <button onClick={reinitialiserMois} className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-orange-600">Confirmer ↺</button>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Exporter</h2>
            <p className="text-sm text-gray-500 mb-5">Choisissez ce que vous voulez exporter et dans quel format.</p>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Export Excel (CSV)</p>
              <button onClick={() => exporterCSV(locataires.filter(l => l.statut === 'en_retard'), 'loyers_en_retard')} className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 text-left">
                <span className="text-lg">📊</span>
                <div><p className="font-medium text-gray-900 text-sm">Loyers en retard</p><p className="text-xs text-gray-400">{totalRetard} locataires</p></div>
              </button>
              <button onClick={() => exporterCSV(locataires, 'tous_les_locataires')} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left">
                <span className="text-lg">📊</span>
                <div><p className="font-medium text-gray-900 text-sm">Tous les locataires</p><p className="text-xs text-gray-400">{locataires.length} locataires</p></div>
              </button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Export PDF</p>
              <button onClick={() => exporterPDF(locataires.filter(l => l.statut === 'en_retard'), 'Loyers en retard')} className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 text-left">
                <span className="text-lg">📄</span>
                <div><p className="font-medium text-gray-900 text-sm">Loyers en retard</p><p className="text-xs text-gray-400">{totalRetard} locataires</p></div>
              </button>
              <button onClick={() => exporterPDF(locataires, 'Tous les locataires')} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-left">
                <span className="text-lg">📄</span>
                <div><p className="font-medium text-gray-900 text-sm">Tous les locataires</p><p className="text-xs text-gray-400">{locataires.length} locataires</p></div>
              </button>
            </div>
            <button onClick={() => setShowExport(false)} className="mt-4 w-full bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-medium hover:bg-gray-200">Fermer</button>
          </div>
        </div>
      )}

      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          {nomAgence && <><span className="text-gray-300">|</span><span className="text-sm font-medium text-gray-600">{nomAgence}</span></>}
        </div>
        <div className="flex items-center gap-3">
          <a href="/parametres" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100">⚙ Paramètres</a>
          <button onClick={() => setShowExport(true)} className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-200">↓ Exporter</button>
          <button onClick={() => setConfirmReinit(true)} className="bg-orange-100 text-orange-700 text-sm px-4 py-2 rounded-lg hover:bg-orange-200">↺ Nouveau mois</button>
          <a href="/import" className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-200">↑ Importer CSV</a>
          <a href="/locataires/nouveau" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ Nouveau locataire</a>
          <button onClick={deconnexion} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Déconnexion</button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border"><p className="text-sm text-gray-500">Total locataires</p><p className="text-3xl font-bold text-gray-900 mt-1">{locataires.length}</p></div>
        <div className="bg-white rounded-xl p-5 border cursor-pointer" onClick={() => setOnglet('retard')}><p className="text-sm text-gray-500">Loyers en retard</p><p className="text-3xl font-bold text-red-500 mt-1">{totalRetard}</p></div>
        <div className="bg-white rounded-xl p-5 border cursor-pointer" onClick={() => setOnglet('paye')}><p className="text-sm text-gray-500">Loyers payés</p><p className="text-3xl font-bold text-green-500 mt-1">{totalPaye}</p></div>
        <div className="bg-white rounded-xl p-5 border cursor-pointer" onClick={() => setOnglet('attente')}><p className="text-sm text-gray-500">En attente</p><p className="text-3xl font-bold text-orange-400 mt-1">{totalAttente}</p></div>
      </div>

      <div className="px-6 mb-4 flex gap-3">
        <input type="text" placeholder="Rechercher par nom, appartement ou email..." value={recherche} onChange={e => setRecherche(e.target.value)} className="flex-1 bg-white border rounded-xl px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => setShowFiltres(!showFiltres)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${filtresActifs ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          ⚡ Filtres {filtresActifs && '•'}
        </button>
      </div>

      {showFiltres && (
        <div className="px-6 mb-4">
          <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-end">
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Loyer minimum (€)</label><input type="number" placeholder="Ex: 500" value={filtreMinLoyer} onChange={e => setFiltreMinLoyer(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-32" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Loyer maximum (€)</label><input type="number" placeholder="Ex: 1200" value={filtreMaxLoyer} onChange={e => setFiltreMaxLoyer(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-32" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">Jours de retard min</label><input type="number" placeholder="Ex: 10" value={filtreMinJours} onChange={e => setFiltreMinJours(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-32" /></div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Trier par</label>
              <select value={tri} onChange={e => setTri(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="retard_desc">Jours de retard ↓</option>
                <option value="retard_asc">Jours de retard ↑</option>
                <option value="nom_asc">Nom A → Z</option>
                <option value="nom_desc">Nom Z → A</option>
                <option value="loyer_desc">Loyer ↓</option>
                <option value="loyer_asc">Loyer ↑</option>
              </select>
            </div>
            {filtresActifs && <button onClick={resetFiltres} className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-2">✕ Réinitialiser</button>}
          </div>
        </div>
      )}

      <div className="px-6 mb-4">
        <div className="flex gap-2 bg-white rounded-xl border p-1 w-fit">
          {onglets.map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${onglet === o.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {o.label}<span className={`ml-2 font-bold ${onglet === o.id ? 'text-white' : o.color}`}>{o.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="bg-white rounded-xl border divide-y">
          {onglet === 'retard' && enRetard.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">{recherche || filtresActifs ? 'Aucun résultat.' : 'Aucun loyer en retard 🎉'}</p>}
          {onglet === 'attente' && enAttente.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">{recherche || filtresActifs ? 'Aucun résultat.' : 'Aucun locataire en attente.'}</p>}
          {onglet === 'paye' && payes.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">{recherche || filtresActifs ? 'Aucun résultat.' : 'Aucun paiement reçu ce mois-ci.'}</p>}

          {onglet === 'attente' && enAttente.length > 0 && (
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-50">
              <p className="text-sm text-gray-500 flex-1">Actions groupées · {enAttente.length} locataires</p>
              <button onClick={toutMarquerPaye} className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700">✓ Tout marquer payé</button>
              <button onClick={toutMarquerEnRetard} className="bg-red-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-red-600">✕ Tout en retard</button>
            </div>
          )}

          {onglet === 'retard' && enRetard.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.nom}</p>
                <p className="text-sm text-gray-500">{l.appartement}</p>
                {l.derniere_relance && <p className="text-xs text-gray-400 mt-0.5">Dernière relance il y a {joursDepuis(l.derniere_relance) === 0 ? "moins d'1 jour" : joursDepuis(l.derniere_relance) + 'j'}</p>}
              </div>
              <div className="flex items-center gap-2">
                {badgeRetard(joursEnRetard(l.date_retard))}
                <span className="font-semibold text-gray-900">{l.loyer_montant}€</span>
                <button onClick={() => demanderRelance(l)} className="bg-blue-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-700">Envoyer relance</button>
                <button onClick={() => marquerPaye(l.id)} className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700">Marquer payé</button>
                <a href={"/locataires/" + l.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200">Voir</a>
              </div>
            </div>
          ))}

          {onglet === 'attente' && enAttente.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.nom}</p>
                <p className="text-sm text-gray-500">{l.appartement}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{l.loyer_montant}€</span>
                <button onClick={() => marquerPaye(l.id)} className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700">Marquer payé</button>
                <button onClick={() => marquerEnRetard(l.id)} className="bg-red-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-red-600">En retard</button>
                <a href={"/locataires/" + l.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200">Voir</a>
              </div>
            </div>
          ))}

          {onglet === 'paye' && payes.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.nom}</p>
                <p className="text-sm text-gray-500">{l.appartement}</p>
                <p className="text-xs text-gray-400 mt-0.5">Échéance le {l.loyer_echeance} du mois (dans {prochainPaiement(l.loyer_echeance)} jours)</p>
              </div>
              <div className="flex items-center gap-2">
                {l.loyer_echeance && badgeProchainPaiement(prochainPaiement(l.loyer_echeance))}
                <span className="font-semibold text-gray-900">{l.loyer_montant}€</span>
                <span className="text-green-600 text-sm font-medium">✓ Payé</span>
                <button onClick={() => marquerEnRetard(l.id)} className="bg-gray-200 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-300">Annuler</button>
                <a href={"/locataires/" + l.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200">Voir</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}