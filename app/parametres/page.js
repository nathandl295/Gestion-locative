'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import { useToast } from '../toast'

const TEMPLATES_DEFAULT = [
  { nom: 'Relance douce', jours_min: 1, jours_max: 7, sujet: 'Rappel loyer - {appartement}', corps: 'Bonjour {nom},\n\nNous vous rappelons que votre loyer de {montant}€ pour le logement {appartement} est en attente de règlement.\n\nMerci de procéder au paiement dans les plus brefs délais.\n\nCordialement' },
  { nom: 'Relance ferme', jours_min: 8, jours_max: 20, sujet: 'Loyer impayé - Action requise - {appartement}', corps: 'Bonjour {nom},\n\nMalgré notre précédent rappel, votre loyer de {montant}€ pour le logement {appartement} reste impayé.\n\nNous vous demandons de régulariser cette situation sous 48h.\n\nCordialement' },
  { nom: 'Mise en demeure', jours_min: 21, jours_max: null, sujet: 'URGENT - Mise en demeure - {appartement}', corps: 'Bonjour {nom},\n\nVotre loyer de {montant}€ pour le logement {appartement} est en retard depuis plus de 21 jours.\n\nSans règlement sous 72h, nous serons contraints d\'engager une procédure de recouvrement.\n\nCordialement' },
]

export default function Parametres() {
  const router = useRouter()
  const { toast } = useToast()
  const [nomAgence, setNomAgence] = useState('')
  const [agenceId, setAgenceId] = useState(null)
  const [savingAgence, setSavingAgence] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [templates, setTemplates] = useState([])
  const [templateEdite, setTemplateEdite] = useState(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [relancesAuto, setRelancesAuto] = useState(false)
  const [frequenceRelance, setFrequenceRelance] = useState(7)
  const [savingRelances, setSavingRelances] = useState(false)
  const [onglet, setOnglet] = useState('agence')

  useEffect(() => {
    async function init() {
      // Attendre que la session soit bien chargée
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Réessayer une fois après 500ms (délai hydration)
        setTimeout(async () => {
          const { data: { session: session2 } } = await supabase.auth.getSession()
          if (!session2) { router.push('/login'); return }
          setUserEmail(session2.user.email)
          await chargerDonnees()
        }, 500)
        return
      }
      setUserEmail(session.user.email)
      await chargerDonnees()
    }

    async function chargerDonnees() {
      const { data: agence } = await supabase.from('agence').select('*').single()
      if (agence) {
        setNomAgence(agence.nom || '')
        setAgenceId(agence.id)
        setRelancesAuto(agence.relances_auto || false)
        setFrequenceRelance(agence.frequence_relance || 7)
      }
      const { data: tmpl } = await supabase.from('templates').select('*').order('jours_min')
      if (tmpl && tmpl.length > 0) setTemplates(tmpl)
      else setTemplates(TEMPLATES_DEFAULT)
    }

    init()
  }, [])

  async function sauvegarderAgence() {
    setSavingAgence(true)
    if (agenceId) await supabase.from('agence').update({ nom: nomAgence }).eq('id', agenceId)
    else await supabase.from('agence').insert([{ nom: nomAgence }])
    setSavingAgence(false)
    toast('Nom de l\'agence sauvegarde', 'success')
  }

  async function sauvegarderRelances() {
    setSavingRelances(true)
    if (agenceId) await supabase.from('agence').update({ relances_auto: relancesAuto, frequence_relance: parseInt(frequenceRelance) }).eq('id', agenceId)
    setSavingRelances(false)
    toast('Parametres de relances sauvegardes', 'success')
  }

  async function sauvegarderTemplate() {
    if (!templateEdite) return
    setSavingTemplate(true)
    if (templateEdite.id) {
      await supabase.from('templates').update({
        nom: templateEdite.nom, sujet: templateEdite.sujet, corps: templateEdite.corps,
        jours_min: templateEdite.jours_min, jours_max: templateEdite.jours_max
      }).eq('id', templateEdite.id)
      setTemplates(templates.map(t => t.id === templateEdite.id ? { ...t, ...templateEdite } : t))
    } else {
      const { data } = await supabase.from('templates').insert([templateEdite]).select().single()
      if (data) setTemplates(templates.map(t => t.nom === templateEdite.nom ? data : t))
    }
    setSavingTemplate(false)
    setTemplateEdite(null)
    toast('Template sauvegarde', 'success')
  }

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '11px 16px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }
  const cardStyle = { background: '#13131a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }
  const fo = e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'
  const fb = e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'

  const onglets = [
    { id: 'agence', label: '🏢 Agence' },
    { id: 'templates', label: '📧 Templates emails' },
    { id: 'relances', label: '⚡ Relances auto' },
    { id: 'compte', label: '👤 Compte' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input,select,textarea { font-family: inherit; }
        input:focus,select:focus,textarea:focus { border-color: rgba(59,130,246,0.5) !important; outline: none; }
        .nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #64748b; text-decoration: none; transition: all 0.2s; border: none; background: none; width: 100%; text-align: left; cursor: pointer; }
        .nav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
        .tab-btn { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .tab-btn.active { background: #2563eb; color: white; }
        .tab-btn.inactive { background: rgba(255,255,255,0.04); color: #64748b; }
        .tab-btn.inactive:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }
        .toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; inset: 0; background: rgba(255,255,255,0.1); border-radius: 24px; transition: 0.3s; }
        .slider:before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        input:checked + .slider { background: #2563eb; }
        input:checked + .slider:before { transform: translateX(20px); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: '240px', flexShrink: 0, background: '#13131a', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', marginBottom: '16px', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 60 60"><rect x="2" y="10" width="12" height="40" rx="6" fill="#3b82f6"/><rect x="22" y="18" width="12" height="32" rx="6" fill="#3b82f6" opacity="0.7"/><rect x="42" y="26" width="12" height="24" rx="6" fill="#3b82f6" opacity="0.4"/></svg>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>GestImmo</span>
        </a>
        <a href="/dashboard" className="nav-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </a>
        <a href="/stats" className="nav-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Statistiques
        </a>
        <a href="/historique" className="nav-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Historique
        </a>
        <div style={{ flex: 1 }} />
        <a href="/parametres" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', color: '#60a5fa', textDecoration: 'none', background: 'rgba(59,130,246,0.15)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Parametres
        </a>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Parametres</h1>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Configurez votre espace GestImmo.</p>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
            {onglets.map(o => (
              <button key={o.id} className={`tab-btn ${onglet === o.id ? 'active' : 'inactive'}`} onClick={() => setOnglet(o.id)}>{o.label}</button>
            ))}
          </div>

          {/* ===== ONGLET AGENCE ===== */}
          {onglet === 'agence' && (
            <div style={cardStyle}>
              <h2 style={labelStyle}>Nom de l'agence</h2>
              <input style={inputStyle} value={nomAgence} onChange={e => setNomAgence(e.target.value)} placeholder="Agence Martin Immobilier" onFocus={fo} onBlur={fb} />
              <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px', marginBottom: '20px' }}>Apparait sur les quittances de loyer generees.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={sauvegarderAgence} disabled={savingAgence} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  {savingAgence ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          )}

          {/* ===== ONGLET TEMPLATES ===== */}
          {onglet === 'templates' && (
            <div>
              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#60a5fa' }}>
                💡 Variables disponibles : <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{'{nom}'}</code> <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{'{montant}'}</code> <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{'{appartement}'}</code>
              </div>

              {templates.map((t, i) => (
                <div key={i} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => setTemplateEdite(templateEdite?.nom === t.nom ? null : { ...t })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: i === 0 ? 'rgba(52,211,153,0.12)' : i === 1 ? 'rgba(251,146,60,0.12)' : 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        {i === 0 ? '💬' : i === 1 ? '⚠️' : '🚨'}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>{t.nom}</div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          Retard : {t.jours_min}j — {t.jours_max ? t.jours_max + 'j' : 'et plus'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: templateEdite?.nom === t.nom ? 'rotate(180deg)' : 'none' }}>▼</span>
                  </div>

                  {templateEdite?.nom === t.nom && (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>Nom du template</label>
                        <input style={inputStyle} value={templateEdite.nom} onChange={e => setTemplateEdite({...templateEdite, nom: e.target.value})} onFocus={fo} onBlur={fb} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={labelStyle}>Jours min</label>
                          <input type="number" style={inputStyle} value={templateEdite.jours_min} onChange={e => setTemplateEdite({...templateEdite, jours_min: parseInt(e.target.value)})} onFocus={fo} onBlur={fb} />
                        </div>
                        <div>
                          <label style={labelStyle}>Jours max (vide = illimite)</label>
                          <input type="number" style={inputStyle} value={templateEdite.jours_max || ''} onChange={e => setTemplateEdite({...templateEdite, jours_max: e.target.value ? parseInt(e.target.value) : null})} onFocus={fo} onBlur={fb} placeholder="Illimite" />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Sujet de l'email</label>
                        <input style={inputStyle} value={templateEdite.sujet} onChange={e => setTemplateEdite({...templateEdite, sujet: e.target.value})} onFocus={fo} onBlur={fb} />
                      </div>
                      <div>
                        <label style={labelStyle}>Corps de l'email</label>
                        <textarea style={{ ...inputStyle, minHeight: '140px', resize: 'vertical', lineHeight: 1.6 }} value={templateEdite.corps} onChange={e => setTemplateEdite({...templateEdite, corps: e.target.value})} onFocus={fo} onBlur={fb} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setTemplateEdite(null)} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={sauvegarderTemplate} disabled={savingTemplate} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          {savingTemplate ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ===== ONGLET RELANCES AUTO ===== */}
          {onglet === 'relances' && (
            <div>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>Relances automatiques</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Envoyer automatiquement les relances selon les templates configures.</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={relancesAuto} onChange={e => setRelancesAuto(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>

                {relancesAuto && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <label style={labelStyle}>Frequence de verification (tous les X jours)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="number" min="1" max="30" style={{ ...inputStyle, width: '120px' }} value={frequenceRelance} onChange={e => setFrequenceRelance(e.target.value)} onFocus={fo} onBlur={fb} />
                      <span style={{ fontSize: '13px', color: '#64748b' }}>jours</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#334155', marginTop: '8px' }}>
                      Le systeme verifiera chaque nuit les locataires en retard et enverra la relance correspondant au template configure.
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={sauvegarderRelances} disabled={savingRelances} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    {savingRelances ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa', marginBottom: '10px' }}>💡 Comment ca fonctionne</div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>
                  Quand les relances automatiques sont activees, le systeme envoie chaque nuit un email aux locataires en retard en utilisant le template correspondant a leur nombre de jours de retard. Configurez les templates dans l'onglet "Templates emails" pour personnaliser les messages.
                </div>
              </div>
            </div>
          )}

          {/* ===== ONGLET COMPTE ===== */}
          {onglet === 'compte' && (
            <div>
              <div style={cardStyle}>
                <h2 style={labelStyle}>Compte connecte</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '3px' }}>Email</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>{userEmail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
                    <span style={{ fontSize: '12px', color: '#34d399' }}>Connecte</span>
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Se deconnecter
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}