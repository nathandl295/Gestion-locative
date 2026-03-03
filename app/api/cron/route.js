import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

function joursEnRetard(dateRetard) {
  if (!dateRetard) return 0
  const debut = new Date(dateRetard)
  const aujourd_hui = new Date()
  const diff = aujourd_hui - debut
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const aujourd_hui = new Date()
  const jourDuMois = aujourd_hui.getDate()

  // ─── 1. Repasser les locataires payés en "en_attente" si échéance dépassée ───
  const { data: payesAVerifier } = await supabase
    .from('locataires')
    .select('*')
    .eq('statut', 'paye')

  let repassesEnAttente = 0
  for (const locataire of payesAVerifier || []) {
    const echeance = locataire.loyer_echeance || 5
    // Si aujourd'hui = jour d'échéance + 1, on repasse en attente
    if (jourDuMois === echeance + 1) {
      await supabase
        .from('locataires')
        .update({ statut: 'en_attente' })
        .eq('id', locataire.id)
      repassesEnAttente++
    }
  }

  // ─── 2. Envoyer les relances automatiques ───
  const { data: locataires } = await supabase
    .from('locataires')
    .select('*')
    .eq('statut', 'en_retard')

  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .eq('auto_active', true)
    .order('jours_min')

  const { data: configFreq } = await supabase
    .from('config')
    .select('*')
    .eq('cle', 'auto_frequence')
    .single()

  const frequence = configFreq ? parseInt(configFreq.valeur) : 3

  let envoyes = 0
  for (const locataire of locataires || []) {
    const jours = joursEnRetard(locataire.date_retard)
    const template = templates.find(t => jours >= t.jours_min && (t.jours_max === null || jours <= t.jours_max))
    if (!template) continue

    if (locataire.derniere_relance_auto) {
      const derniere = new Date(locataire.derniere_relance_auto)
      const diffJours = Math.floor((aujourd_hui - derniere) / (1000 * 60 * 60 * 24))
      if (diffJours < frequence) continue
    }

    const corps = template.corps
      .split('\\n').join('<br/>')
      .split('\n').join('<br/>')
      .replace(/{nom}/g, locataire.nom)
      .replace(/{montant}/g, locataire.loyer_montant)
      .replace(/{appartement}/g, locataire.appartement)

    const sujet = template.sujet
      .replace(/{nom}/g, locataire.nom)
      .replace(/{montant}/g, locataire.loyer_montant)
      .replace(/{appartement}/g, locataire.appartement)

    await resend.emails.send({
      from: 'GestImmo <onboarding@resend.dev>',
      to: locataire.email,
      subject: sujet,
      html: corps
    })

    await supabase
      .from('locataires')
      .update({ 
        derniere_relance_auto: new Date().toISOString(),
        derniere_relance: new Date().toISOString()
      })
      .eq('id', locataire.id)

    await supabase
      .from('relances')
      .insert([{ 
        locataire_id: locataire.id, 
        template_nom: template.nom,
        envoye_le: new Date().toISOString()
      }])

    envoyes++
  }

  return Response.json({ success: true, envoyes, repassesEnAttente })
}