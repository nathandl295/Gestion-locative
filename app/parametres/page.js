'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Logo from '../logo'

export default function Parametres() {
  const [templates, setTemplates] = useState([])
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({})
  const [autoFrequence, setAutoFrequence] = useState(3)
  const [nomAgence, setNomAgence] = useState('')
  const [agenceId, setAgenceId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingAgence, setSavingAgence] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: t } = await supabase.from('templates').select('*').order('jours_min')
      setTemplates(t || [])
      const { data: configFreq } = await supabase.from('config').select('*').eq('cle', 'auto_frequence').single()
      if (configFreq) setAutoFrequence(parseInt(configFreq.valeur))
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) { setNomAgence(agence.nom); setAgenceId(agence.id) }
    }
    fetchData()
  }, [])

  async function sauvegarderAgence() {
    setSavingAgence(true)
    await supabase.from('agence').update({ nom: nomAgence }).eq('id', agenceId)
    setSavingAgence(false)
    alert('Nom de l\'agence mis à jour !')
  }

  async function toggleAuto(template) {
    const nouvelleValeur = !template.auto_active
    await supabase.from('templates').update({ auto_active: nouvelleValeur }).eq('id', template.id)
    setTemplates(templates.map(t => t.id === template.id ? { ...t, auto_active: nouvelleValeur } : t))
  }

  async function sauvegarderFrequence() {
    setSaving(true)
    await supabase.from('config').update({ valeur: String(autoFrequence) }).eq('cle', 'auto_frequence')
    setSaving(false)
    alert('Fréquence sauvegardée !')
  }

  function startEdit(template) {
    setEditId(template.id)
    setForm({ ...template })
  }

  async function sauvegarder() {
    await supabase.from('templates').update({
      nom: form.nom,
      jours_min: parseInt(form.jours_min),
      jours_max: form.jours_max ? parseInt(form.jours_max) : null,
      sujet: form.sujet,
      corps: form.corps,
    }).eq('id', editId)
    setTemplates(templates.map(t => t.id === editId ? { ...form, auto_active: t.auto_active } : t))
    setEditId(null)
  }

  function badgeNiveau(template) {
    if (template.jours_min >= 15) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">Urgent</span>
    if (template.jours_min >= 5) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">Ferme</span>
    return <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">Amical</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Retour</a>
      </div>

      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">

        {/* Nom de l'agence */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Nom de l'agence</h2>
          <p className="text-sm text-gray-500 mb-4">Affiché dans le header à côté du logo</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={nomAgence}
              onChange={e => setNomAgence(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom de votre agence"
            />
            <button
              onClick={sauvegarderAgence}
              disabled={savingAgence}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {savingAgence ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Fréquence automatique */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Fréquence des relances automatiques</h2>
          <p className="text-sm text-gray-500 mb-4">Nombre de jours entre chaque relance automatique pour un même locataire</p>
          <div className="flex items-center gap-3">
            <input type="number" min="1" max="30" value={autoFrequence} onChange={e => setAutoFrequence(e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm" />
            <span className="text-sm text-gray-500">jours</span>
            <button onClick={sauvegarderFrequence} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </div>
        </div>

        {/* Templates */}
        <h2 className="text-lg font-semibold text-gray-900 -mb-2">Templates de relance</h2>
        <p className="text-sm text-gray-500 -mt-4">Utilisez <strong>{"{nom}"}</strong>, <strong>{"{montant}"}</strong> et <strong>{"{appartement}"}</strong> pour insérer les infos du locataire.</p>

        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border p-5">
            {editId === template.id ? (
              <div className="flex flex-col gap-3">
                <div><label className="text-sm font-medium text-gray-700">Nom du template</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">À partir du jour</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" type="number" value={form.jours_min} onChange={e => setForm({ ...form, jours_min: e.target.value })} /></div>
                  <div><label className="text-sm font-medium text-gray-700">Jusqu'au jour (vide = illimité)</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" type="number" value={form.jours_max || ''} onChange={e => setForm({ ...form, jours_max: e.target.value })} /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Sujet de l'email</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-gray-700">Corps de l'email</label><textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={6} value={form.corps} onChange={e => setForm({ ...form, corps: e.target.value })} /></div>
                <div className="flex gap-3">
                  <button onClick={sauvegarder} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">Sauvegarder</button>
                  <button onClick={() => setEditId(null)} className="flex-1 bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium">Annuler</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {badgeNiveau(template)}
                    <h2 className="font-semibold text-gray-900">{template.nom}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{template.auto_active ? 'Auto activé' : 'Manuel'}</span>
                      <button onClick={() => toggleAuto(template)} className={`relative w-12 h-6 rounded-full transition-colors ${template.auto_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${template.auto_active ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <button onClick={() => startEdit(template)} className="text-sm text-blue-600 hover:text-blue-700">Modifier</button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">Envoyé à partir du jour <strong>{template.jours_min}</strong>{template.jours_max ? ` jusqu'au jour ${template.jours_max}` : ' et au-delà'}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Sujet :</strong> {template.sujet}</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{template.corps}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}