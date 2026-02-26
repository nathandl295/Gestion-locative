'use client'

import { useState } from 'react'
import { supabase } from '../../supabase'
import { useRouter } from 'next/navigation'

export default function NouveauLocataire() {
  const router = useRouter()
  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    appartement: '',
    loyer_montant: '',
    loyer_echeance: '5',
  })

  async function handleSubmit() {
    await supabase.from('locataires').insert([{
      ...form,
      loyer_montant: parseInt(form.loyer_montant),
      loyer_echeance: parseInt(form.loyer_echeance),
      statut: 'en_attente'
    }])
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nouveau locataire</h1>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border p-6 flex flex-col gap-4">

          <div>
            <label className="text-sm font-medium text-gray-700">Nom complet</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.nom}
              onChange={e => setForm({...form, nom: e.target.value})}
              placeholder="Martin Dupont"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder="martin@gmail.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Téléphone</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.telephone}
              onChange={e => setForm({...form, telephone: e.target.value})}
              placeholder="0612345678"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Appartement</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.appartement}
              onChange={e => setForm({...form, appartement: e.target.value})}
              placeholder="Appt 12B"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Loyer (€)</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.loyer_montant}
              onChange={e => setForm({...form, loyer_montant: e.target.value})}
              placeholder="850"
              type="number"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Date d'échéance (jour du mois)</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.loyer_echeance}
              onChange={e => setForm({...form, loyer_echeance: e.target.value})}
              placeholder="5"
              type="number"
              min="1"
              max="28"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 mt-2">
            Ajouter le locataire
          </button>

        </div>
      </div>
    </div>
  )
}