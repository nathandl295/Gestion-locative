'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'
import Logo from '../logo'

const CHAMPS = [
  { value: '', label: 'Ignorer' },
  { value: 'nom', label: 'Nom' },
  { value: 'email', label: 'Email' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'loyer_montant', label: 'Loyer (€)' },
  { value: 'loyer_echeance', label: 'Échéance (jour du mois)' },
]

export default function Import() {
  const router = useRouter()
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [erreurs, setErreurs] = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [step, setStep] = useState(1)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lignes = ev.target.result.trim().split('\n')
      const hdrs = lignes[0].split(',').map(h => h.trim())
      const rawRows = lignes.slice(1).map(l => l.split(',').map(v => v.trim()))
      const autoMapping = {}
      hdrs.forEach(h => {
        const lower = h.toLowerCase()
        if (lower.includes('nom') || lower.includes('name') || lower.includes('locataire')) autoMapping[h] = 'nom'
        else if (lower.includes('mail') || lower.includes('email')) autoMapping[h] = 'email'
        else if (lower.includes('tel') || lower.includes('phone') || lower.includes('mobile')) autoMapping[h] = 'telephone'
        else if (lower.includes('appart') || lower.includes('logement') || lower.includes('bien')) autoMapping[h] = 'appartement'
        else if (lower.includes('loyer') || lower.includes('montant')) autoMapping[h] = 'loyer_montant'
        else if (lower.includes('echeance') || lower.includes('jour')) autoMapping[h] = 'loyer_echeance'
        else autoMapping[h] = ''
      })
      setHeaders(hdrs)
      setRows(rawRows)
      setMapping(autoMapping)
      setStep(2)
    }
    reader.readAsText(file)
  }

  function genererPreview() {
    const errs = []
    const result = []
    if (!Object.values(mapping).includes('nom')) errs.push('Vous devez mapper le champ "Nom"')
    if (!Object.values(mapping).includes('appartement')) errs.push('Vous devez mapper le champ "Appartement"')
    if (!Object.values(mapping).includes('loyer_montant')) errs.push('Vous devez mapper le champ "Loyer (€)"')
    if (errs.length > 0) { setErreurs(errs); return }
    rows.forEach((row, i) => {
      const obj = {}
      headers.forEach((h, idx) => { const champ = mapping[h]; if (champ) obj[champ] = row[idx] || '' })
      if (!obj.nom) { errs.push('Ligne ' + (i + 2) + ' : nom manquant'); return }
      if (!obj.appartement) { errs.push('Ligne ' + (i + 2) + ' : appartement manquant'); return }
      if (!obj.loyer_montant || isNaN(obj.loyer_montant)) { errs.push('Ligne ' + (i + 2) + ' : loyer invalide'); return }
      result.push({ nom: obj.nom, email: obj.email || '', telephone: obj.telephone || '', appartement: obj.appartement, loyer_montant: parseInt(obj.loyer_montant), loyer_echeance: parseInt(obj.loyer_echeance) || 5, statut: 'en_attente' })
    })
    setErreurs(errs)
    setPreview(result)
    if (result.length > 0) setStep(3)
  }

  async function importer() {
    setImporting(true)
    const { error } = await supabase.from('locataires').insert(preview)
    if (error) { alert('Erreur : ' + error.message) } else { setDone(true); setTimeout(() => router.push('/dashboard'), 2000) }
    setImporting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>
      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        <div className={`bg-white rounded-xl border p-5 ${step !== 1 && 'opacity-50'}`}>
          <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span><h2 className="font-semibold text-gray-900">Charger votre fichier CSV</h2></div>
          <input type="file" accept=".csv" onChange={handleFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
        {step >= 2 && (
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span><h2 className="font-semibold text-gray-900">Associer vos colonnes</h2></div>
            <div className="flex flex-col gap-3">
              {headers.map(h => (
                <div key={h} className="flex items-center justify-between gap-4">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">{h}</div>
                  <span className="text-gray-400">→</span>
                  <select value={mapping[h] || ''} onChange={e => setMapping({ ...mapping, [h]: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm">
                    {CHAMPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {erreurs.length > 0 && <div className="mt-4 bg-red-50 rounded-lg p-3">{erreurs.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}</div>}
            <button onClick={genererPreview} className="mt-4 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700">Vérifier les données →</button>
          </div>
        )}
        {step >= 3 && preview.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span><h2 className="font-semibold text-gray-900">{preview.length} locataires prêts à importer</h2></div>
            <div className="divide-y max-h-64 overflow-y-auto mb-4">
              {preview.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div><p className="font-medium text-sm text-gray-900">{l.nom}</p><p className="text-xs text-gray-500">{l.appartement} · {l.loyer_montant}€</p></div>
                  <p className="text-xs text-gray-400">{l.email}</p>
                </div>
              ))}
            </div>
            {done ? <p className="text-green-600 font-medium text-sm">✓ Import réussi ! Redirection...</p> : <button onClick={importer} disabled={importing} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">{importing ? 'Import en cours...' : 'Importer ' + preview.length + ' locataires'}</button>}
          </div>
        )}
      </div>
    </div>
  )
}