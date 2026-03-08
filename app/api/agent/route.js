import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function joursEnRetard(d) {
  if (!d) return 0
  return Math.floor((new Date() - new Date(d)) / 86400000)
}

export async function POST(req) {
  try {
    const body = await req.json()
    // Supporte les deux formats : { messages } ou { message, history }
    const messages = body.messages || [...(body.history || []), { role: 'user', content: body.message }]

    // Récupérer les données en temps réel
    const [{ data: locataires }, { data: agence }, { data: templates }] = await Promise.all([
      supabase.from('locataires').select('*'),
      supabase.from('agence').select('*').single(),
      supabase.from('templates').select('*').order('jours_min')
    ])

    const locs = locataires || []
    const enRetard = locs.filter(l => l.statut === 'en_retard')
    const payes = locs.filter(l => l.statut === 'paye')
    const enAttente = locs.filter(l => l.statut === 'en_attente')
    const totalLoyers = locs.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)
    const loyersArisque = enRetard.reduce((acc, l) => acc + (parseFloat(l.loyer_montant) || 0), 0)

    const contexte = `Tu es l'assistant IA de l'agence "${agence?.nom || 'GestImmo'}".

DONNÉES EN TEMPS RÉEL :
- Total locataires : ${locs.length}
- En retard : ${enRetard.length} (${loyersArisque}€ à risque)
- Payés ce mois : ${payes.length}
- En attente : ${enAttente.length}
- Loyers totaux/mois : ${totalLoyers}€

TEMPLATES DISPONIBLES :
${(templates || []).map(t => `- nom:"${t.nom}" | sujet:"${t.sujet}" | pour: ${t.jours_min}j${t.jours_max ? '-' + t.jours_max + 'j' : '+'} de retard`).join('\n') || 'Aucun template'}

LOCATAIRES EN RETARD (avec leurs IDs exacts) :
${enRetard.map(l => `- ID:"${l.id}" | ${l.nom} (${l.appartement}) : ${joursEnRetard(l.date_retard)}j de retard, ${l.loyer_montant}€${l.derniere_relance ? `, dernière relance il y a ${Math.floor((new Date() - new Date(l.derniere_relance)) / 86400000)}j` : ', jamais relancé'}`).join('\n') || 'Aucun'}

TOUS LES LOCATAIRES (avec leurs IDs exacts) :
${locs.map(l => `- ID:"${l.id}" | ${l.nom} (${l.appartement}) : ${l.statut}, ${l.loyer_montant}€/mois`).join('\n')}

RÈGLES ABSOLUES :
1. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.
2. Format OBLIGATOIRE : {"message":"ta réponse en français","actions":[]}
3. CRITIQUE : Quand l'utilisateur demande d'envoyer une relance, tu DOIS mettre l'action dans le tableau "actions" avec l'ID exact et le nom exact du template demandé.
4. Actions disponibles :
   - Envoyer relance : {"type":"envoyer_relance","nom":"Nom Prénom","id":"uuid-exact","template":"nom exact du template"}
   - Marquer payé : {"type":"marquer_paye","nom":"Nom Prénom","id":"uuid-exact"}
   - Marquer en retard : {"type":"marquer_retard","nom":"Nom Prénom","id":"uuid-exact"}
5. Pour le champ "template" : utilise le nom exact du template listé ci-dessus. Si l'utilisateur dit "mise en demeure", choisis le template mise en demeure. Si il dit "relance amiable", choisis le template amiable. Si il ne précise pas, choisis selon les jours de retard.
6. Pour plusieurs locataires, mets plusieurs objets dans le tableau actions.
7. Utilise TOUJOURS l'ID exact fourni dans la liste ci-dessus, jamais un ID inventé.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: contexte,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Erreur API Claude:', data)
      return NextResponse.json({ message: 'Erreur API Claude : ' + (data.error?.message || 'inconnue'), actions: [] })
    }

    const texte = data.content?.map(c => c.text || '').join('').trim()

    let parsed
    try {
      parsed = JSON.parse(texte)
    } catch (e) {
      parsed = { message: texte, actions: [] }
    }

    // Exécuter les actions si présentes
    const actionsResults = []
    for (const action of (parsed.actions || [])) {
      try {
        if (action.type === 'marquer_paye' && action.id) {
          const { error } = await supabase.from('locataires').update({ statut: 'paye', date_retard: null }).eq('id', action.id)
          actionsResults.push({ ...action, success: !error })
        } else if (action.type === 'marquer_retard' && action.id) {
          const { error } = await supabase.from('locataires').update({ statut: 'en_retard', date_retard: new Date().toISOString() }).eq('id', action.id)
          actionsResults.push({ ...action, success: !error })
        } else if (action.type === 'envoyer_relance' && action.id) {
          const locataire = locs.find(l => l.id === action.id)
          if (locataire) {
            const j = joursEnRetard(locataire.date_retard)
            // Utilise le template demandé par l'IA, sinon fallback sur les jours de retard
            const template = action.template
              ? templates?.find(t => t.nom.toLowerCase() === action.template.toLowerCase()) || templates?.find(t => j >= t.jours_min && (t.jours_max === null || j <= t.jours_max))
              : templates?.find(t => j >= t.jours_min && (t.jours_max === null || j <= t.jours_max))
            if (template) {
              const replace = s => s.replace(/{nom}/g, locataire.nom).replace(/{montant}/g, locataire.loyer_montant).replace(/{appartement}/g, locataire.appartement)
              const sujet = replace(template.sujet)
              const corps = replace(template.corps).replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')
              try {
                await resend.emails.send({
                  from: `${agence?.nom || 'GestImmo'} <onboarding@resend.dev>`,
                  to: locataire.email,
                  subject: sujet,
                  html: corps
                })
                const now = new Date().toISOString()
                await supabase.from('relances').insert([{ locataire_id: locataire.id, template_nom: template.nom, envoye_le: now }])
                await supabase.from('locataires').update({ derniere_relance: now }).eq('id', locataire.id)
                actionsResults.push({ ...action, success: true })
              } catch (e) {
                actionsResults.push({ ...action, success: false, reason: e.message })
              }
            } else {
              actionsResults.push({ ...action, success: false, reason: 'Aucun template applicable' })
            }
          }
        }
      } catch (e) {
        actionsResults.push({ ...action, success: false, reason: e.message })
      }
    }

    const actionsWithLabel = actionsResults.map(a => ({
      ...a,
      label: a.type === 'marquer_paye' ? `${a.nom} marqué payé`
        : a.type === 'marquer_retard' ? `${a.nom} en retard`
        : a.type === 'envoyer_relance' ? `Relance envoyée à ${a.nom}`
        : a.type
    }))

    return NextResponse.json({ reply: parsed.message, actions: actionsWithLabel })

  } catch (e) {
    console.error('Erreur agent:', e)
    return NextResponse.json({ reply: 'Une erreur est survenue : ' + e.message, actions: [] })
  }
}