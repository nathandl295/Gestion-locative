'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import { useToast } from '../toast'

export default function Import() {
  const router = useRouter()
  const { toast } = useToast()
  const [colonnes, setColonnes] = useState([])
  const [lignes, setLignes] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [drag, setDrag] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  const champs = [
    { key: 'nom', label: 'Nom', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'telephone', label: 'Telephone', required: false },
    { key: 'appartement', label: 'Appartement', required: true },
    { key: 'loyer_montant', label: 'Loyer (€)', required: true },
    { key: 'loyer_echeance', label: 'Echeance (jour)', required: false },
  ]

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return
    const sep = lines[0].includes(';') ? ';' : ','
    const cols = lines[0].split(sep).map(c => c.trim().replace(/['"]/g, ''))
    const rows = lines.slice(1).map(l => l.split(sep).map(c => c.trim().replace(/['"]/g, '')))
    setColonnes(cols)
    setLignes(rows)
    const autoMap = {}
    champs.forEach(c => {
      const idx = cols.findIndex(col => col.toLowerCase().includes(c.key.split('_')[0].toLowerCase()) || col.toLowerCase() === c.label.toLowerCase())
      if (idx >= 0) autoMap[c.key] = idx
    })
    setMapping(autoMap)
  }

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => parseCSV(e.target.result)
    reader.readAsText(file, 'utf-8')
  }

  async function importer() {
    const required = champs.filter(c => c.required)
    if (required.some(c => mapping[c.key] === undefined)) { toast('Mappez les colonnes obligatoires (Nom, Appartement, Loyer)', 'error'); return }
    setImporting(true)
    const rows = lignes.filter(r => r.some(c => c.trim()))
    const data = rows.map(r => ({
      nom: r[mapping.nom] || '',
      email: mapping.email !== undefined ? r[mapping.email] : '',
      telephone: mapping.telephone !== undefined ? r[mapping.telephone] : '',
      appartement: r[mapping.appartement] || '',
      loyer_montant: parseFloat(r[mapping.loyer_montant]) || 0,
      loyer_echeance: mapping.loyer_echeance !== undefined ? parseInt(r[mapping.loyer_echeance]) || null : null,
      statut: 'en_attente',
    })).filter(d => d.nom && d.appartement)
    const { error } = await supabase.from('locataires').insert(data)
    if (error) { toast('Erreur : ' + error.message, 'error'); setImporting(false); return }
    toast(data.length + ' locataires importes avec succes !', 'success')
    router.push('/dashboard')
  }

  const selectStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', width: '100%' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } select option { background: #1a1a24; }`}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        {[{ href: '/dashboard', label: 'Dashboard' }, { href: '/stats', label: 'Statistiques' }, { href: '/historique', label: 'Historique' }].map(l => (
          <a key={l.href} href={l.href} style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#64748b', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b' }}>{l.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href="/import" style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#60a5fa', textDecoration: 'none', background: 'rgba(59,130,246,0.15)', display: 'block' }}>↑ Importer CSV</a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '40px', maxWidth: '760px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Importer des locataires</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Importez vos locataires depuis un fichier CSV ou Excel.</p>
        </div>

        {/* Zone drop */}
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
          style={{ background: drag ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: `2px dashed ${drag ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '48px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '24px' }}>
          <input ref={fileRef} type="file" accept=".csv,.tsv" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📁</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: fileName ? '#60a5fa' : '#94a3b8', marginBottom: '6px' }}>{fileName || 'Cliquez ou glissez votre fichier CSV'}</div>
          <div style={{ fontSize: '12px', color: '#334155' }}>Fichiers .csv ou .tsv — separateur virgule ou point-virgule</div>
        </div>

        {/* Mapping colonnes */}
        {colonnes.length > 0 && (
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mapping des colonnes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {champs.map(c => (
                <div key={c.key}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {c.label} {c.required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <select style={selectStyle} value={mapping[c.key] ?? ''} onChange={e => setMapping({ ...mapping, [c.key]: e.target.value !== '' ? parseInt(e.target.value) : undefined })}>
                    <option value="">— Non mappee</option>
                    {colonnes.map((col, i) => <option key={i} value={i}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apercu */}
        {lignes.length > 0 && (
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '24px', overflow: 'auto' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Apercu ({Math.min(lignes.length, 3)} / {lignes.length} lignes)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>{colonnes.map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: '500' }}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {lignes.slice(0, 3).map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '8px 12px', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bouton importer */}
        {colonnes.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', textDecoration: 'none' }}>Annuler</a>
            <button onClick={importer} disabled={importing} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {importing ? 'Import en cours...' : `Importer ${lignes.length} locataires`}
            </button>
          </div>
        )}

        {/* Aide */}
        <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '14px', padding: '20px', marginTop: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '10px' }}>💡 Format CSV attendu</div>
          <code style={{ fontSize: '12px', color: '#475569', fontFamily: "'DM Mono', monospace", display: 'block', lineHeight: 1.8 }}>
            nom,email,appartement,loyer_montant,loyer_echeance<br/>
            Sophie Bernard,sophie@email.com,Appt 3A,720,5<br/>
            Marc Dupont,marc@email.com,Appt 1B,850,10
          </code>
        </div>
      </div>
    </div>
  )
}