export interface OptionAdvisorInput {
  type: 'CALL' | 'PUT'
  strike: number
  currentPrice: number
  expiryDays: number
  impliedVol?: number
}

export interface OptionAdvisorOutput {
  profit_probability: number
  breakeven: number
  risk_level: 'Low' | 'Medium' | 'High'
  insight: string
  confidence: number
}

export interface PoolAdvisorInput {
  utilization: number
  weeklyVolume: number
  apy: number
}

export interface PoolAdvisorOutput {
  weekly_yield: number
  risk_level: 'LOW' | 'MED' | 'HIGH'
  insight: string
  confidence: number
}

export async function getOptionAdvisorInsight(input: OptionAdvisorInput): Promise<OptionAdvisorOutput> {
  try {
    const response = await fetch('/api/claude/option-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('API error')
    return await response.json()
  } catch {
    // Fallback hardcoded insight
    const isCall = input.type === 'CALL'
    const otm = isCall ? input.strike > input.currentPrice : input.strike < input.currentPrice
    const probability = otm ? 34 : 62
    const breakeven = isCall ? input.strike + 0.08 : input.strike - 0.08
    return {
      profit_probability: probability,
      breakeven: +breakeven.toFixed(2),
      risk_level: otm ? 'Medium' : 'Low',
      insight: `At current volatility this ${input.type} has a ${probability}% chance of profit. Implied volatility is ${input.impliedVol ? (input.impliedVol * 100).toFixed(0) : 68}% with ${input.expiryDays} days until expiry.`,
      confidence: 68,
    }
  }
}

export async function getPoolAdvisorInsight(input: PoolAdvisorInput): Promise<PoolAdvisorOutput> {
  try {
    const response = await fetch('/api/claude/pool-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('API error')
    return await response.json()
  } catch {
    const risk = input.utilization > 70 ? 'HIGH' : input.utilization > 40 ? 'MED' : 'LOW'
    return {
      weekly_yield: +(input.apy / 52).toFixed(2),
      risk_level: risk,
      insight: `Pool utilization is ${input.utilization}%. Expected weekly yield: ${(input.apy / 52).toFixed(1)}%. Current market volatility suggests ${risk === 'LOW' ? 'healthy' : risk === 'MED' ? 'moderate' : 'elevated'} premium flow.`,
      confidence: 72,
    }
  }
}
