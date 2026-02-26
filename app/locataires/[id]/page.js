'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useRouter, useParams } from 'next/navigation'

export default function LocataireDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [locataire, setLocataire] = useState(null)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    async function fetchLocataire() {
      const { data } = await supabase
        .from('locataires')
        .select('*')
        .eq('id', id)
        .single()
      setLocataire(data)
      setForm(data)
    }
    fetchLocataire()
  }, [id])

  async function sauvegarder() {
    await supabase.from('locataires').update({
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      appartement: form.appartement,
      loyer_montant: parseInt(form.loyer_montant),
      loyer_echeance: parseInt(form.loyer_echeance),
    }).eq('id', id)
    setLocataire(form)
    setEdit(false)
  }

  async function supprimer() {
    if (!confirm(`Supprimer ${locataire.nom} ?`)) return
    await supabase.from('locataires').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (!locataire) return <div className="p-6">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{locataire.nom}</h1>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border p-6 flex flex-col gap-4">

          {!edit ? (
            <>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-500">Nom</p>
                  <p className="font-medium">{locataire.nom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{locataire.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-medium">{locataire.telephone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Appartement</p>
                  <p className="font-medium">{locataire.appartement}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loyer</p>
                  <p className="font-medium">{locataire.loyer_montant}€</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Échéance</p>
                  <p className="font-medium">Le {locataire.loyer_echeance} du mois</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="font-medium capitalize">{locataire.statut.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setEdit(true)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Modifier
                </button>
                <button
                  onClick={supprimer}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium">
                  Supprimer
                </button>
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
                { label: "Échéance (jour du mois)", key: 'loyer_echeance', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    type={type || 'text'}
                    value={form[key] || ''}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={sauvegarder}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                  Sauvegarder
                </button>
                <button
                  onClick={() => setEdit(false)}
                  className="flex-1 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium">
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}