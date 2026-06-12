// ─── Dynamic Expiries — always next 3 Fridays from today ─────────────────────
function getNextFridays(count: number) {
  const fridays = []
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const firstFriday = new Date(now)
  firstFriday.setUTCDate(now.getUTCDate() + daysUntilFriday)
  firstFriday.setUTCHours(12, 0, 0, 0)

  for (let i = 0; i < count; i++) {
    const d = new Date(firstFriday)
    d.setUTCDate(d.getUTCDate() + i * 7)
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    fridays.push({
      label,
      date: d.toISOString().split('T')[0],
      daysLeft,
    })
  }
  return fridays
}

// ─── Dynamic Strikes — generated around current price ────────────────────────
// Generates 6 strikes: 3 below, 1 ATM, 2 above current price
// Rounded to nearest sensible increment based on price magnitude
export function generateStrikes(currentPrice: number, count: number = 6): number[] {
  // Determine step size based on price
  let step: number
  if (currentPrice < 0.10) step = 0.005
  else if (currentPrice < 0.50) step = 0.01
  else if (currentPrice < 2.00) step = 0.05
  else if (currentPrice < 10) step = 0.25
  else step = 1.0

  // Round current price down to nearest step
  const base = Math.floor(currentPrice / step) * step

  // Generate strikes: 2 below ATM, ATM, 3 above ATM
  const strikes = []
  for (let i = -2; i <= count - 3; i++) {
    const strike = +(base + i * step).toFixed(4)
    if (strike > 0) strikes.push(strike)
  }
  return strikes
}

// ─── Markets — prices are live-overridden in components, these are fallbacks ──
// Strikes are generated dynamically around the fallback price
// For accurate strikes, components should regenerate based on live price
const SUI_PRICE_FALLBACK = 0.74
const DEEP_PRICE_FALLBACK = 0.121
const CETUS_PRICE_FALLBACK = 0.256

export const MARKETS = [
  {
    id: 'sui-usdc',
    name: 'SUI/USDC',
    symbol: 'SUI',
    price: SUI_PRICE_FALLBACK,
    change24h: 4.24,
    openInterest: 4120000,
    volume24h: 18360000,
    liquidity: 9200000,
    strikes: generateStrikes(SUI_PRICE_FALLBACK, 6),
    impliedVol: 68.4,
    contractSize: 5,  // testnet — reduced for demo. Mainnet: 100
  },
  {
    id: 'deep-usdc',
    name: 'DEEP/USDC',
    symbol: 'DEEP',
    price: DEEP_PRICE_FALLBACK,
    change24h: -2.18,
    openInterest: 2740000,
    volume24h: 8910000,
    liquidity: 4100000,
    strikes: generateStrikes(DEEP_PRICE_FALLBACK, 6),
    impliedVol: 82.1,
    contractSize: 50,  // testnet — reduced for demo. Mainnet: 1000
  },
  {
    id: 'cetus-usdc',
    name: 'CETUS/USDC',
    symbol: 'CETUS',
    price: CETUS_PRICE_FALLBACK,
    change24h: 6.71,
    openInterest: 1980000,
    volume24h: 6430000,
    liquidity: 3800000,
    strikes: generateStrikes(CETUS_PRICE_FALLBACK, 6),
    impliedVol: 74.9,
    contractSize: 25,  // testnet — reduced for demo. Mainnet: 500
  },
]

export const EXPIRIES = getNextFridays(3)

export const ORDER_BOOK = {
  asks: [
    { price: 1.97, size: 12840, total: 78329 },
    { price: 1.96, size: 8230,  total: 66440 },
    { price: 1.95, size: 15620, total: 57280 },
    { price: 1.94, size: 9410,  total: 41630 },
    { price: 1.93, size: 13050, total: 32220 },
    { price: 1.92, size: 6800,  total: 19170 },
    { price: 1.91, size: 4200,  total: 12370 },
    { price: 1.90, size: 8170,  total: 8170  },
  ],
  markPrice: 1.89,
  bids: [
    { price: 1.88, size: 11230, total: 11230  },
    { price: 1.87, size: 14780, total: 26010  },
    { price: 1.86, size: 16420, total: 42430  },
    { price: 1.85, size: 12640, total: 55070  },
    { price: 1.84, size: 17210, total: 72280  },
    { price: 1.83, size: 9840,  total: 82120  },
    { price: 1.82, size: 14300, total: 96420  },
    { price: 1.81, size: 7620,  total: 104040 },
  ],
}

export const RECENT_TRADES = [
  { price: 1.89, size: 2349, time: '12:45:32', side: 'buy'  },
  { price: 1.88, size: 1120, time: '12:45:21', side: 'sell' },
  { price: 1.89, size: 3580, time: '12:45:10', side: 'buy'  },
  { price: 1.90, size: 890,  time: '12:44:59', side: 'buy'  },
  { price: 1.88, size: 4210, time: '12:44:48', side: 'sell' },
  { price: 1.89, size: 1560, time: '12:44:37', side: 'buy'  },
  { price: 1.87, size: 2780, time: '12:44:09', side: 'sell' },
  { price: 1.89, size: 650,  time: '12:44:42', side: 'buy'  },
]

export const OPEN_POSITIONS = [
  { id: 'pos-1', market: 'SUI/USDC', type: 'CALL', strike: 0.80, expiry: 'Jun 20', qty: 10, premium: 0.42, currentValue: 0.672, pnl: 26.35, pnlPct: 62.7 },
  { id: 'pos-2', market: 'SUI/USDC', type: 'PUT',  strike: 0.70, expiry: 'Jun 20', qty: 5,  premium: 0.31, currentValue: 0.155, pnl: -8.12, pnlPct: -52.4 },
]

export const EXPIRED_POSITIONS = [
  { id: 'exp-1', market: 'SUI/USDC', type: 'CALL', strike: 0.70, expiry: 'Jun 06', premium: 0.25, pnl: 15.80, settled: true  },
  { id: 'exp-2', market: 'SUI/USDC', type: 'PUT',  strike: 0.80, expiry: 'Jun 06', premium: 0.26, pnl: -26.00, settled: false },
]

export const POOL_STATS = {
  deposited: 12450,
  earnings: 1284,
  earningsPct: 12.4,
  utilization: 45,
  apy: 22.4,
  apyChange: 2.1,
  riskLevel: 'LOW' as const,
  weeklyYield: 2.3,
  monthlyEstimate: 9.1,
}

export const PORTFOLIO_STATS = {
  portfolioValue: 5324.18,
  totalPnl: 842.36,
  totalPnlPct: 18.8,
  activePositions: 3,
  premiumsPaid: 1284.45,
}

export const TRANSACTION_HISTORY = [
  { id: 'tx-1', date: 'Jun 11, 12:45', type: 'Buy PUT',           market: 'SUI/USDC',   strike: 0.80, expiry: 'Jun 20', qty: 10,   amount: -0.42 },
  { id: 'tx-2', date: 'Jun 10, 18:32', type: 'Liquidity Deposit', market: '-',           strike: null, expiry: '-',     qty: null, amount: -5.00 },
  { id: 'tx-3', date: 'Jun 09, 14:11', type: 'Buy CALL',          market: 'SUI/USDC',   strike: 0.75, expiry: 'Jun 20', qty: 5,    amount: -0.31 },
  { id: 'tx-4', date: 'Jun 08, 14:11', type: 'Claim Settlement',  market: 'SUI/USDC',   strike: 0.70, expiry: 'Jun 06', qty: null, amount: 0.28  },
  { id: 'tx-5', date: 'Jun 07, 10:45', type: 'Buy CALL',          market: 'CETUS/USDC', strike: 0.20, expiry: 'Jun 27', qty: 8,    amount: -0.18 },
]

export const SETTLEMENT_HISTORY = [
  { date: 'Jun 06, 2026',  market: 'SUI/USDC',   strike: 0.75, result: 'OTM', payout: 0,    txHash: '0x7a1f...bd2c' },
  { date: 'May 30, 2026',  market: 'SUI/USDC',   strike: 0.80, result: 'ITM', payout: 0.32, txHash: '0x0d2c...e154' },
  { date: 'May 23, 2026',  market: 'CETUS/USDC', strike: 0.20, result: 'ITM', payout: 0.18, txHash: '0x1f9a...b21f' },
]

export const EXPIRING_POSITIONS = [
  { id: 'exp-pos-1', market: 'SUI/USDC', type: 'CALL', strike: 0.75, currentPrice: 0.74, expectedPayout: 0,    qty: 10 },
  { id: 'exp-pos-2', market: 'SUI/USDC', type: 'PUT',  strike: 0.80, currentPrice: 0.74, expectedPayout: 0.30, qty: 5  },
  { id: 'exp-pos-3', market: 'SUI/USDC', type: 'CALL', strike: 0.70, currentPrice: 0.74, expectedPayout: 0.20, qty: 8  },
]

export function generatePriceData(basePrice: number, days: number = 90) {
  const data = []
  let price = basePrice * 0.6
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  for (let i = days; i >= 0; i--) {
    const time = Math.floor((now - i * dayMs) / 1000)
    const open = price
    const change = (Math.random() - 0.48) * price * 0.04
    const close = Math.max(price + change, 0.001)
    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)
    const volume = Math.floor(Math.random() * 5000000 + 1000000)
    data.push({ time, open: +open.toFixed(4), high: +high.toFixed(4), low: +low.toFixed(4), close: +close.toFixed(4), volume })
    price = close
  }
  return data
}

export const PLATFORM_STATS = {
  totalVolume: 482000000,
  openInterest: 21400000,
  totalLiquidity: 89000000,
  activeTraders: 12481,
}

export const SPARKLINE_DATA = {
  'sui-usdc':   [0.68, 0.71, 0.69, 0.73, 0.72, 0.70, 0.74, 0.73, 0.75, 0.74, 0.73, 0.74],
  'deep-usdc':  [0.110, 0.115, 0.112, 0.118, 0.120, 0.119, 0.121, 0.122, 0.120, 0.121, 0.120, 0.121],
  'cetus-usdc': [0.230, 0.240, 0.235, 0.245, 0.250, 0.248, 0.252, 0.255, 0.253, 0.256, 0.254, 0.256],
}