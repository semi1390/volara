import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, strike, currentPrice, expiryDays, impliedVol } = body

    const prompt = `Given the following options trade parameters, provide a JSON analysis:
- Option Type: ${type}
- Strike Price: $${strike}
- Current Asset Price: $${currentPrice}
- Days to Expiry: ${expiryDays}
- Implied Volatility: ${((impliedVol || 0.68) * 100).toFixed(0)}%

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "profit_probability": <number 0-100>,
  "breakeven": <number>,
  "risk_level": "<Low|Medium|High>",
  "insight": "<1-2 sentence plain English insight about this trade>",
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
    // Return fallback data on error
    return NextResponse.json({
      profit_probability: 34,
      breakeven: 1.82,
      risk_level: 'Medium',
      insight: 'At current volatility this option has moderate profit potential. Consider your risk tolerance before entering.',
      confidence: 68,
    })
  }
}
