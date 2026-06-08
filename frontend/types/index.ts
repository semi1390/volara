export interface Market {
  id: string
  name: string
  symbol: string
  price: number
  change24h: number
  openInterest: number
  volume24h: number
  liquidity: number
  strikes: number[]
  impliedVol: number
}

export interface OrderBookEntry {
  price: number
  size: number
  total: number
}

export interface Trade {
  price: number
  size: number
  time: string
  side: 'buy' | 'sell'
}

export interface Position {
  id: string
  market: string
  type: 'CALL' | 'PUT'
  strike: number
  expiry: string
  qty: number
  premium: number
  currentValue: number
  pnl: number
  pnlPct: number
}

export interface PoolStats {
  deposited: number
  earnings: number
  earningsPct: number
  utilization: number
  apy: number
  apyChange: number
  riskLevel: 'LOW' | 'MED' | 'HIGH'
  weeklyYield: number
  monthlyEstimate: number
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OptionType = 'CALL' | 'PUT'
export type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'Low' | 'Medium' | 'High'
