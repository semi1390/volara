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
  return `${sign}${value.toFixed(2)} USDC`
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

export function calculatePremium(
  type: 'CALL' | 'PUT',
  strike: number,
  currentPrice: number,
  daysToExpiry: number,
  impliedVol: number = 0.68
): number {
  // Simplified Black-Scholes approximation
  const T = daysToExpiry / 365
  const sigma = impliedVol
  const r = 0.05
  const S = currentPrice
  const K = strike

  if (type === 'CALL') {
    const intrinsic = Math.max(0, S - K)
    const timeValue = S * sigma * Math.sqrt(T) * 0.4
    return +(intrinsic + timeValue).toFixed(4)
  } else {
    const intrinsic = Math.max(0, K - S)
    const timeValue = S * sigma * Math.sqrt(T) * 0.4
    return +(intrinsic + timeValue).toFixed(4)
  }
}
