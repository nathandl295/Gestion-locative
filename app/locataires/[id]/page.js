'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useRouter, useParams } from 'next/navigation'
import Logo from '../../logo'

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  const debut = new Date(dateRetard)
  const aujourd_hui = new Date()
  const diff = aujourd_hui - debut
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LocataireDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [locataire, setLocataire] = useState(null)
  const [historique, setHistorique] = useState([])
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})
  const [joursRetard, setJoursRetard] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('locataires').select('*').eq('id', id).single()
      setLocataire(data)
      setForm(data)
      setJoursRetard(joursEnRetard(data.date_retard))
      const { data: relances } = await supabase.from('relances').select('*').eq('locataire_id', id).order('envoye_le', { ascending: false })
      setHistorique(relances || [])
    }
    fetchData()
  }, [id])

  async function sauvegarder() {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(joursRetard || 0))
    const dateRetard = locataire.statut === 'en_retard' ? date.toISOString() : null
    await supabase.from('locataires').update({ nom: form.nom, email: form.email, telephone: form.telephone, appartement: form.appartement, loyer_montant: parseInt(form.loyer_montant), loyer_echeance: parseInt(form.loyer_echeance), date_retard: dateRetard }).eq('id', id)
    setLocataire({ ...form, date_retard: dateRetard })
    setEdit(false)
  }

  async function supprimer() {
    if (!confirm('Supprimer ' + locataire.nom + ' ?')) return
    await supabase.from('locataires').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (!locataire) return <div className="p-6">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>
      <div className="max-w-lg mx-auto p-6 flex flex-col gap-6">
        <div className="bg-white rounded-xl border p-6 flex flex-col gap-4">
          {!edit ? (
            <>
              <div className="flex flex-col gap-3">
                <div><p className="text-xs text-gray-500">Nom</p><p className="font-medium">{locataire.nom}</p></div>
                <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{locataire.email}</p></div>
                <div><p className="text-xs text-gray-500">Téléphone</p><p className="font-medium">{locataire.telephone}</p></div>
                <div><p className="text-xs text-gray-500">Appartement</p><p className="font-medium">{locataire.appartement}</p></div>
                <div><p className="text-xs text-gray-500">Loyer</p><p className="font-medium">{locataire.loyer_montant}€</p></div>
                <div><p className="text-xs text-gray-500">Échéance</p><p className="font-medium">Le {locataire.loyer_echeance} du mois</p></div>
                <div><p className="text-xs text-gray-500">Statut</p><p className="font-medium capitalize">{locataire.statut.replace('_', ' ')}</p></div>
                {locataire.statut === 'en_retard' && <div><p className="text-xs text-gray-500">Jours de retard</p><p className="font-medium text-red-500">{joursEnRetard(locataire.date_retard)} jours</p></div>}
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setEdit(true)} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">Modifier</button>
                <button onClick={supprimer} className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium">Supprimer</button>
              </div>
            </>
          ) : (
            <>
              {[
                { label: 'Nom', key: 'nom' },
                { label: 'Email', key: 'email' },
                { label: 'Téléphone', key: 'telephone' },
                { label: 'Appartement', key: 'appartement' },
                { label: 'Loyer (€)', key: 'loyer_montant', type: 'number' },
                { label: 'Échéance (jour du mois)', key: 'loyer_echeance', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" type={type || 'text'} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              {locataire.statut === 'en_retard' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Jours de retard</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" type="number" min="0" value={joursRetard} onChange={e => setJoursRetard(e.target.value)} />
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={sauvegarder} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">Sauvegarder</button>
                <button onClick={() => setEdit(false)} className="flex-1 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium">Annuler</button>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Historique des relances</h2>
          {historique.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune relance envoyée pour l'instant.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {historique.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-sm">✉</span>
                    <span className="text-sm font-medium text-gray-800">{r.template_nom}</span>
                  </div>
                  <div className="text-right">
  <p className="text-xs text-gray-400">{formatDate(r.envoye_le)}</p>
  <p className="text-xs text-blue-400">il y a {Math.floor((new Date() - new Date(r.envoye_le)) / (1000 * 60 * 60 * 24)) === 0 ? "moins d'1 jour" : Math.floor((new Date() - new Date(r.envoye_le)) / (1000 * 60 * 60 * 24)) + ' jours'}</p>
</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}