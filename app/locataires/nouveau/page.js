'use client'

import { useState } from 'react'
import { supabase } from '../../supabase'
import { useRouter } from 'next/navigation'
import Logo from '../../logo'

export default function NouveauLocataire() {
  const router = useRouter()
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', appartement: '', loyer_montant: '', loyer_echeance: '5' })

  async function submit() {
    if (!form.nom || !form.appartement || !form.loyer_montant) { alert('Nom, appartement et loyer sont obligatoires.'); return }
    await supabase.from('locataires').insert([{ ...form, loyer_montant: parseInt(form.loyer_montant), loyer_echeance: parseInt(form.loyer_echeance), statut: 'en_attente' }])
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl border p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 text-lg mb-1">Nouveau locataire</h2>
          {[
            { label: 'Nom *', key: 'nom' },
            { label: 'Email', key: 'email' },
            { label: 'Téléphone', key: 'telephone' },
            { label: 'Appartement *', key: 'appartement' },
            { label: 'Loyer (€) *', key: 'loyer_montant', type: 'number' },
            { label: 'Échéance (jour du mois)', key: 'loyer_echeance', type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" type={type || 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <button onClick={submit} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 mt-2">Ajouter le locataire</button>
        </div>
      </div>
    </div>
  )
}