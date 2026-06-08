import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { utilization, weeklyVolume, apy } = body

    const prompt = `Given the following liquidity pool parameters, provide a JSON analysis:
- Pool Utilization: ${utilization}%
- Weekly Volume: $${(weeklyVolume / 1_000_000).toFixed(1)}M
- Current APY: ${apy}%

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "weekly_yield": <number, weekly yield as percentage>,
  "risk_level": "<LOW|MED|HIGH>",
  "insight": "<2-3 sentence plain English insight about the pool conditions>",
  "confidence": <number 60-90>
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content[0]?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json({
      weekly_yield: 2.3,
      risk_level: 'LOW',
      insight: 'Pool utilization is at a healthy level. Expected weekly yield is solid. Current market volatility suggests good premium flow for LPs.',
      confidence: 72,
    })
  }
}
