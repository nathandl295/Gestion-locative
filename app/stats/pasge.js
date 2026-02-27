'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import Logo from './logo'

export default function Stats() {
  const router = useRouter()
  const [locataires, setLocataires] = useState([])
  const [nomAgence, setNomAgence] = useState('')
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Chargement...</p></div>

  const enRetard = locataires.filter(l => l.statut === 'en_retard')
  const payes = locataires.filter(l => l.statut === 'paye')
  const enAttente = locataires.filter(l => l.statut === 'en_attente')

  const totalLoyers = locataires.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const montantEnRetard = enRetard.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const montantPaye = payes.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
  const loyerMoyen = locataires.length > 0 ? totalLoyers / locataires.length : 0
  const tauxRecouvrement = locataires.length > 0 ? Math.round((payes.length / locataires.length) * 100) : 0

  function joursEnRetard(dateRetard) {
    if (!dateRetard) return 0
    const diff = new Date() - new Date(dateRetard)
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const retardMoyen = enRetard.length > 0
    ? Math.round(enRetard.reduce((acc, l) => acc + joursEnRetard(l.date_retard), 0) / enRetard.length)
    : 0

  const plusEnRetard = [...enRetard].sort((a, b) => joursEnRetard(b.date_retard) - joursEnRetard(a.date_retard)).slice(0, 5)

  // Répartition par tranche de retard
  const retard1a5 = enRetard.filter(l => joursEnRetard(l.date_retard) <= 5).length
  const retard6a15 = enRetard.filter(l => joursEnRetard(l.date_retard) > 5 && joursEnRetard(l.date_retard) <= 15).length
  const retard16plus = enRetard.filter(l => joursEnRetard(l.date_retard) > 15).length

  // Loyers par tranche
  const tranches = [
    { label: '< 500€', count: locataires.filter(l => l.loyer_montant < 500).length },
    { label: '500-800€', count: locataires.filter(l => l.loyer_montant >= 500 && l.loyer_montant < 800).length },
    { label: '800-1200€', count: locataires.filter(l => l.loyer_montant >= 800 && l.loyer_montant < 1200).length },
    { label: '> 1200€', count: locataires.filter(l => l.loyer_montant >= 1200).length },
  ]
  const maxTranche = Math.max(...tranches.map(t => t.count), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          {nomAgence && <><span className="text-gray-300">|</span><span className="text-sm font-medium text-gray-600">{nomAgence}</span></>}
        </div>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100">← Retour</a>
      </div>

      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-sm text-gray-500 mt-1">{locataires.length} locataires · {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">Montant en retard</p>
            <p className="text-2xl font-bold text-red-500">{montantEnRetard.toLocaleString('fr-FR')}€</p>
            <p className="text-xs text-gray-400 mt-1">{enRetard.length} locataire{enRetard.length > 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">Taux de recouvrement</p>
            <p className="text-2xl font-bold text-blue-600">{tauxRecouvrement}%</p>
            <p className="text-xs text-gray-400 mt-1">{payes.length} payé{payes.length > 1 ? 's' : ''} sur {locataires.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">Loyer moyen</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(loyerMoyen).toLocaleString('fr-FR')}€</p>
            <p className="text-xs text-gray-400 mt-1">Total : {totalLoyers.toLocaleString('fr-FR')}€/mois</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">Retard moyen</p>
            <p className="text-2xl font-bold text-orange-500">{retardMoyen}j</p>
            <p className="text-xs text-gray-400 mt-1">Sur les locataires en retard</p>
          </div>
        </div>

        {/* Taux de recouvrement visuel */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition des statuts</h2>
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-4">
            {payes.length > 0 && <div style={{ width: (payes.length / locataires.length * 100) + '%' }} className="bg-green-500 flex items-center justify-center text-white text-xs font-bold">{payes.length > 2 ? payes.length : ''}</div>}
            {enAttente.length > 0 && <div style={{ width: (enAttente.length / locataires.length * 100) + '%' }} className="bg-orange-400 flex items-center justify-center text-white text-xs font-bold">{enAttente.length > 2 ? enAttente.length : ''}</div>}
            {enRetard.length > 0 && <div style={{ width: (enRetard.length / locataires.length * 100) + '%' }} className="bg-red-500 flex items-center justify-center text-white text-xs font-bold">{enRetard.length > 2 ? enRetard.length : ''}</div>}
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span><span className="text-gray-600">Payés <strong>{payes.length}</strong> ({Math.round(payes.length/locataires.length*100)||0}%)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span><span className="text-gray-600">En attente <strong>{enAttente.length}</strong> ({Math.round(enAttente.length/locataires.length*100)||0}%)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span><span className="text-gray-600">En retard <strong>{enRetard.length}</strong> ({Math.round(enRetard.length/locataires.length*100)||0}%)</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Répartition des retards */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Gravité des retards</h2>
            {enRetard.length === 0 ? <p className="text-gray-400 text-sm">Aucun retard en cours 🎉</p> : (
              <div className="flex flex-col gap-3">
                {[
                  { label: '1 à 5 jours', count: retard1a5, color: 'bg-yellow-400' },
                  { label: '6 à 15 jours', count: retard6a15, color: 'bg-orange-400' },
                  { label: '+ de 15 jours', count: retard16plus, color: 'bg-red-500' },
                ].map(t => (
                  <div key={t.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{t.label}</span>
                      <span className="font-semibold text-gray-900">{t.count} locataire{t.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className={`h-2 rounded-full ${t.color}`} style={{ width: enRetard.length > 0 ? (t.count / enRetard.length * 100) + '%' : '0%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Répartition loyers */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Répartition des loyers</h2>
            <div className="flex flex-col gap-3">
              {tranches.map(t => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{t.label}</span>
                    <span className="font-semibold text-gray-900">{t.count} locataire{t.count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: (t.count / maxTranche * 100) + '%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 retards */}
        {plusEnRetard.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Locataires les plus en retard</h2>
            <div className="flex flex-col divide-y">
              {plusEnRetard.map((l, i) => (
                <div key={l.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{l.nom}</p>
                      <p className="text-xs text-gray-400">{l.appartement}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 text-sm">{l.loyer_montant}€</span>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">{joursEnRetard(l.date_retard)}j</span>
                    <a href={"/locataires/" + l.id} className="text-blue-600 text-xs hover:underline">Voir</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résumé financier */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Résumé financier du mois</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Loyers encaissés</p>
              <p className="text-xl font-bold text-green-600">{montantPaye.toLocaleString('fr-FR')}€</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Loyers en retard</p>
              <p className="text-xl font-bold text-red-500">{montantEnRetard.toLocaleString('fr-FR')}€</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total attendu/mois</p>
              <p className="text-xl font-bold text-gray-900">{totalLoyers.toLocaleString('fr-FR')}€</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}