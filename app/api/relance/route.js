import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const { nom, email, montant, appartement } = await request.json()

  await resend.emails.send({
    from: 'GestImmo <onboarding@resend.dev>',
    to: email,
    subject: 'Rappel de loyer',
    html: `
      <p>Bonjour ${nom},</p>
      <p>Nous vous rappelons que votre loyer de <strong>${montant}€</strong> pour l'appartement <strong>${appartement}</strong> est en attente de règlement.</p>
      <p>Merci de procéder au virement dans les plus brefs délais.</p>
      <p>Cordialement,<br/>Votre agence immobilière</p>
    `
  })

  return Response.json({ success: true })
}