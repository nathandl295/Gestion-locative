'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [locataires, setLocataires] = useState([])

  useEffect(() => {
    async function fetchLocataires() {
      const { data } = await supabase.from('locataires').select('*')
      setLocataires(data || [])
    }
    fetchLocataires()
  }, [])

  const enRetard = locataires.filter(l => l.statut === 'en_retard')
  const payes = locataires.filter(l => l.statut === 'paye')
  const enAttente = locataires.filter(l => l.statut === 'en_attente')

  async function marquerPaye(id) {
    await supabase.from('locataires').update({ statut: 'paye' }).eq('id', id)
    setLocataires(locataires.map(l => l.id === id ? { ...l, statut: 'paye' } : l))
  }

  async function marquerEnRetard(id) {
    await supabase.from('locataires').update({ statut: 'en_retard' }).eq('id', id)
    setLocataires(locataires.map(l => l.id === id ? { ...l, statut: 'en_retard' } : l))
  }

  async function envoyerRelance(locataire) {
    await fetch('/api/relance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: locataire.nom,
        email: locataire.email,
        montant: locataire.loyer_montant,
        appartement: locataire.appartement
      })
    })
    alert('Relance envoyée à ' + locataire.nom + ' !')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">GestImmo</h1>
        <a href="/locataires/nouveau" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + Nouveau locataire
        </a>
      </div>

      <div className="p-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-500">Total locataires</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{locataires.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-500">Loyers en retard</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{enRetard.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-500">Loyers payés</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{payes.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{enAttente.length}</p>
        </div>
      </div>

      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Loyers en retard</h2>
        <div className="bg-white rounded-xl border divide-y">
          {enRetard.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">Aucun loyer en retard 🎉</p>}
          {enRetard.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.nom}</p>
                <p className="text-sm text-gray-500">{l.appartement}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{l.loyer_montant}€</span>
                <button onClick={() => envoyerRelance(l)} className="bg-blue-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-700">Envoyer relance</button>
                <button onClick={() => marquerPaye(l.id)} className="bg-green-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-green-700">Marquer payé</button>
                <a href={"/locataires/" + l.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200">Voir</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">En attente de paiement</h2>
        <div className="bg-white rounded-xl border divide-y">
          {enAttente.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">Aucun locataire en attente.</p>}
          {enAttente.map((l) => (
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
        </div>
      </div>

      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Loyers payés</h2>
        <div className="bg-white rounded-xl border divide-y">
          {payes.length === 0 && <p className="px-5 py-4 text-gray-500 text-sm">Aucun paiement reçu ce mois-ci.</p>}
          {payes.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{l.nom}</p>
                <p className="text-sm text-gray-500">{l.appartement}</p>
              </div>
              <div className="flex items-center gap-2">
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