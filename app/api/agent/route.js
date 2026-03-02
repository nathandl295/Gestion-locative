import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  return Math.floor((new Date() - new Date(dateRetard)) / 86400000)
}

export async function POST(req) {
  try {
    const { messages } = await req.json()

    const { data: locataires } = await supabase.from('locataires').select('*')
    const { data: templates } = await supabase.from('templates').select('*').order('jours_min')
    const { data: agence } = await supabase.from('agence').select('*').single()
    const { data: relances } = await supabase.from('relances').select('*').order('envoye_le', { ascending: false }).limit(50)
    const { data: historique } = await supabase.from('historique_paiements').select('*').eq('annee', new Date().getFullYear())

    const enRetard = locataires?.filter(l => l.statut === 'en_retard') || []
    const payes = locataires?.filter(l => l.statut === 'paye') || []
    const enAttente = locataires?.filter(l => l.statut === 'en_attente') || []
    const totalLoyers = locataires?.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0) || 0
    const tauxRecouvrement = locataires?.length > 0 ? Math.round((payes.length / locataires.length) * 100) : 0

    const contexte = `
Tu es l'assistant IA de ${agence?.nom || 'GestImmo'}, un logiciel de gestion locative.
Tu as accès en temps réel à TOUTES les données et tu peux modifier N'IMPORTE QUOI dans l'application.
Réponds en français, de façon concise et professionnelle.
Quand tu modifies quelque chose, confirme ce que tu as fait.
Si tu modifies un template, respecte IMPÉRATIVEMENT les variables {nom}, {montant}, {appartement} si elles étaient présentes.

=== DONNÉES EN TEMPS RÉEL ===

RÉSUMÉ :
- Total locataires : ${locataires?.length || 0}
- En retard : ${enRetard.length} (${enRetard.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)}€)
- Payés ce mois : ${payes.length}
- En attente : ${enAttente.length}
- Loyers totaux/mois : ${totalLoyers}€
- Taux de recouvrement : ${tauxRecouvrement}%

LOCATAIRES EN RETARD :
${enRetard.map(l => `- ID:${l.id} | ${l.nom} | ${l.appartement} | ${l.loyer_montant}€ | ${joursEnRetard(l.date_retard)}j de retard | email:${l.email || 'aucun'}`).join('\n') || 'Aucun'}

LOCATAIRES EN ATTENTE :
${enAttente.map(l => `- ID:${l.id} | ${l.nom} | ${l.appartement} | ${l.loyer_montant}€`).join('\n') || 'Aucun'}

LOCATAIRES PAYÉS :
${payes.map(l => `- ID:${l.id} | ${l.nom} | ${l.appartement} | ${l.loyer_montant}€`).join('\n') || 'Aucun'}

TEMPLATES EMAIL (modifiables) :
${templates?.map(t => `- ID:${t.id} | "${t.nom}" | ${t.jours_min}j à ${t.jours_max || '∞'}j\n  Sujet: ${t.sujet}\n  Corps: ${t.corps}`).join('\n\n') || 'Aucun'}

PARAMÈTRES AGENCE :
- Nom agence : ${agence?.nom || 'Non configuré'} (ID:${agence?.id})
- Relances auto : ${agence?.relances_auto ? 'Activées' : 'Désactivées'}
- Fréquence relances : tous les ${agence?.frequence_relance || 7} jours

HISTORIQUE PAIEMENTS (année en cours) :
${historique?.length || 0} entrées enregistrées

DERNIÈRES RELANCES :
${relances?.slice(0, 10).map(r => {
  const loc = locataires?.find(l => l.id === r.locataire_id)
  return `- ${loc?.nom || 'Inconnu'} : "${r.template_nom}" le ${new Date(r.envoye_le || r.created_at).toLocaleDateString('fr-FR')}`
}).join('\n') || 'Aucune'}

=== ACTIONS DISPONIBLES ===
Tu peux effectuer toute action en ajoutant UN SEUL bloc JSON à la fin :

<actions>
[
  // Locataires
  {"type": "marquer_paye", "locataire_id": "uuid", "nom": "Nom"},
  {"type": "marquer_retard", "locataire_id": "uuid", "nom": "Nom"},
  {"type": "envoyer_relance", "locataire_id": "uuid", "nom": "Nom"},
  {"type": "envoyer_relance_tous"},

  // Templates email
  {"type": "modifier_template", "template_id": "uuid", "nom": "Nouveau nom", "sujet": "Nouveau sujet", "corps": "Nouveau corps avec {nom} {montant} {appartement}", "jours_min": 1, "jours_max": 7},

  // Paramètres agence
  {"type": "modifier_agence", "nom": "Nouveau nom agence"},
  {"type": "toggle_relances_auto", "activer": true},
  {"type": "modifier_frequence_relances", "jours": 7},

  // Locataire individuel
  {"type": "modifier_locataire", "locataire_id": "uuid", "champs": {"loyer_montant": 800, "email": "nouveau@email.com"}}
]
</actions>

RÈGLES IMPORTANTES :
- N'inclus le bloc <actions> QUE si l'utilisateur demande une action concrète
- Pour les questions/analyses, réponds juste en texte sans bloc actions
- Si tu modifies un template, montre le nouveau contenu dans ta réponse texte
- Tu peux combiner plusieurs actions dans le même tableau
- Respecte TOUJOURS les variables {nom}, {montant}, {appartement} dans les templates
`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: contexte,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })

    const text = response.content[0].text
    const actionsMatch = text.match(/<actions>([\s\S]*?)<\/actions>/)
    let actionsResults = []

    if (actionsMatch) {
      try {
        const actions = JSON.parse(actionsMatch[1])
        for (const action of actions) {

          // --- Locataires ---
          if (action.type === 'marquer_paye') {
            await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', action.locataire_id)
            actionsResults.push({ type: 'marquer_paye', nom: action.nom, success: true })
          }

          if (action.type === 'marquer_retard') {
            await supabase.from('locataires').update({ statut: 'en_retard', date_retard: new Date().toISOString() }).eq('id', action.locataire_id)
            actionsResults.push({ type: 'marquer_retard', nom: action.nom, success: true })
          }

          if (action.type === 'modifier_locataire') {
            await supabase.from('locataires').update(action.champs).eq('id', action.locataire_id)
            actionsResults.push({ type: 'modifier_locataire', nom: action.nom || action.locataire_id, success: true })
          }

          if (action.type === 'envoyer_relance') {
            const loc = locataires?.find(l => l.id === action.locataire_id)
            const jours = joursEnRetard(loc?.date_retard)
            const template = templates?.find(t => jours >= t.jours_min && (t.jours_max === null || jours <= t.jours_max))
            if (loc && template && loc.email) {
              const corps = template.corps.replace(/{nom}/g, loc.nom).replace(/{montant}/g, loc.loyer_montant).replace(/{appartement}/g, loc.appartement).split('\n').join('<br/>')
              const sujet = template.sujet.replace(/{nom}/g, loc.nom).replace(/{montant}/g, loc.loyer_montant).replace(/{appartement}/g, loc.appartement)
              const relanceRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/relance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: loc.nom, email: loc.email, sujet, corps, locataire_id: loc.id, template_nom: template.nom })
              })
              actionsResults.push({ type: 'envoyer_relance', nom: loc.nom, success: relanceRes.ok })
            } else {
              actionsResults.push({ type: 'envoyer_relance', nom: action.nom, success: false, reason: !loc?.email ? 'Pas d\'email' : 'Aucun template' })
            }
          }

          if (action.type === 'envoyer_relance_tous') {
            let count = 0
            for (const loc of enRetard) {
              if (!loc.email) continue
              const jours = joursEnRetard(loc.date_retard)
              const template = templates?.find(t => jours >= t.jours_min && (t.jours_max === null || jours <= t.jours_max))
              if (!template) continue
              const corps = template.corps.replace(/{nom}/g, loc.nom).replace(/{montant}/g, loc.loyer_montant).replace(/{appartement}/g, loc.appartement).split('\n').join('<br/>')
              const sujet = template.sujet.replace(/{nom}/g, loc.nom).replace(/{montant}/g, loc.loyer_montant).replace(/{appartement}/g, loc.appartement)
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/relance`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: loc.nom, email: loc.email, sujet, corps, locataire_id: loc.id, template_nom: template.nom })
              })
              count++
            }
            actionsResults.push({ type: 'envoyer_relance_tous', nom: count + ' relances envoyées', success: true })
          }

          // --- Templates ---
          if (action.type === 'modifier_template') {
            const updateData = {}
            if (action.nom !== undefined) updateData.nom = action.nom
            if (action.sujet !== undefined) updateData.sujet = action.sujet
            if (action.corps !== undefined) updateData.corps = action.corps
            if (action.jours_min !== undefined) updateData.jours_min = action.jours_min
            if (action.jours_max !== undefined) updateData.jours_max = action.jours_max
            await supabase.from('templates').update(updateData).eq('id', action.template_id)
            actionsResults.push({ type: 'modifier_template', nom: action.nom || 'Template', success: true })
          }

          // --- Agence ---
          if (action.type === 'modifier_agence') {
            await supabase.from('agence').update({ nom: action.nom }).eq('id', agence?.id)
            actionsResults.push({ type: 'modifier_agence', nom: action.nom, success: true })
          }

          if (action.type === 'toggle_relances_auto') {
            await supabase.from('agence').update({ relances_auto: action.activer }).eq('id', agence?.id)
            actionsResults.push({ type: 'toggle_relances_auto', nom: action.activer ? 'Relances activées' : 'Relances désactivées', success: true })
          }

          if (action.type === 'modifier_frequence_relances') {
            await supabase.from('agence').update({ frequence_relance: action.jours }).eq('id', agence?.id)
            actionsResults.push({ type: 'modifier_frequence_relances', nom: 'Fréquence : ' + action.jours + 'j', success: true })
          }
        }
      } catch (e) { console.error('Erreur parsing actions:', e) }
    }

    const texteNettoye = text.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim()
    return Response.json({ message: texteNettoye, actions: actionsResults })

  } catch (error) {
    console.error('Agent error:', error)
    return Response.json({ message: 'Erreur : ' + error.message }, { status: 500 })
  }
}