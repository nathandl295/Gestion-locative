import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  const { email, sujet, corps, locataire_id, template_nom } = await request.json()

  await resend.emails.send({
    from: 'Agence Pro <onboarding@resend.dev>',
    to: email,
    subject: sujet,
    html: corps.split('\\n').join('<br/>').split('\n').join('<br/>')
  })

  if (locataire_id && template_nom) {
    await supabase.from('relances').insert([{
      locataire_id,
      template_nom,
      envoye_le: new Date().toISOString()
    }])
    await supabase.from('locataires').update({
      derniere_relance: new Date().toISOString()
    }).eq('id', locataire_id)
  }

  return Response.json({ success: true })
}