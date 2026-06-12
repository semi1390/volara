import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, decimals = 2): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(decimals)}`
}

export function formatNumber(value: number, decimals = 2): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(decimals)
}

export function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(4)} SUI`
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getTimeUntilExpiry(targetDate: Date): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds }
}

// Dynamic premium multiplier based on pool utilization
// Matches on-chain MAX_UTILIZATION_BPS = 7000 (70%)
export function getUtilizationMultiplier(utilizationPct: number): number {
  if (utilizationPct < 40) return 1.0   // Normal pricing
  if (utilizationPct < 60) return 1.25  // 25% premium increase
  if (utilizationPct < 70) return 1.5   // 50% premium increase
  if (utilizationPct < 80) return 2.0   // 100% premium increase
  return 2.5                            // 150% premium increase — pool stressed
}

export function getUtilizationWarning(utilizationPct: number): string | null {
  if (utilizationPct < 40) return null
  if (utilizationPct < 60) return 'Pool utilization elevated — premium increased 25%'
  if (utilizationPct < 70) return 'Pool utilization high — premium increased 50%'
  if (utilizationPct >= 70) return '⚠️ Pool near capacity — premium doubled. Consider waiting.'
  return null
}

// Calculate premium per unit (base Black-Scholes)
// contractSize is applied SEPARATELY in the trade page so the UI can show
// per-unit price and total price clearly
export function calculatePremiumPerUnit(
  type: 'CALL' | 'PUT',
  strike: number,
  currentPrice: number,
  daysToExpiry: number,
  impliedVol: number = 0.68,
  poolUtilizationPct: number = 0
): number {
  const T = daysToExpiry / 365
  const sigma = impliedVol
  const S = currentPrice
  const K = strike

  let basePremium: number
  if (type === 'CALL') {
    const intrinsic = Math.max(0, S - K)
    const timeValue = S * sigma * Math.sqrt(T) * 0.4
    basePremium = intrinsic + timeValue
  } else {
    const intrinsic = Math.max(0, K - S)
    const timeValue = S * sigma * Math.sqrt(T) * 0.4
    basePremium = intrinsic + timeValue
  }

  const multiplier = getUtilizationMultiplier(poolUtilizationPct)
  return +(basePremium * multiplier).toFixed(6)
}

// Full premium calculation including contract size
// This is what the user ACTUALLY pays
// contractSize = 100 for SUI, 1000 for DEEP, 500 for CETUS
export function calculatePremium(
  type: 'CALL' | 'PUT',
  strike: number,
  currentPrice: number,
  daysToExpiry: number,
  impliedVol: number = 0.68,
  poolUtilizationPct: number = 0,
  contractSize: number = 1  // default 1 for backwards compatibility
): number {
  const premiumPerUnit = calculatePremiumPerUnit(
    type, strike, currentPrice, daysToExpiry, impliedVol, poolUtilizationPct
  )
  // Total premium = premium per unit × contract size
  return +(premiumPerUnit * contractSize).toFixed(4)
}

// Calculate maximum payout for display purposes
// payout = (settlementPrice - strike) × contractSize × quantity  [CALL]
// payout = (strike - settlementPrice) × contractSize × quantity  [PUT]
export function calculateMaxPayout(
  type: 'CALL' | 'PUT',
  strike: number,
  targetPrice: number,
  contractSize: number,
  quantity: number
): number {
  if (type === 'CALL') {
    return Math.max(0, (targetPrice - strike) * contractSize * quantity)
  } else {
    return Math.max(0, (strike - targetPrice) * contractSize * quantity)
  }
}

// Calculate leverage ratio
// leverage = (contractSize × strike) / premiumPerContract
export function calculateLeverage(
  strike: number,
  contractSize: number,
  premiumPerContract: number
): number {
  if (premiumPerContract <= 0) return 0
  return +((contractSize * strike) / premiumPerContract).toFixed(1)
}

// Calculate total exposure
// exposure = contractSize × quantity × strike
export function calculateExposure(
  strike: number,
  contractSize: number,
  quantity: number
): number {
  return +(strike * contractSize * quantity).toFixed(4)
}