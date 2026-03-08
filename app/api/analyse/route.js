import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { prompt } = await req.json()

    if (!process.env.ANTHROPIC_KEY) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status })
    }

    const texte = data.content?.map(c => c.text || '').join('').trim()
    const parsed = JSON.parse(texte)
    return NextResponse.json(parsed)

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}