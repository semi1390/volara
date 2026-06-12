export const MARKETS = [
  {
    id: 'sui-usdc',
    name: 'SUI/USDC',
    symbol: 'SUI',
    price: 1.93,
    change24h: 4.24,
    openInterest: 4120000,
    volume24h: 18360000,
    liquidity: 9200000,
    strikes: [0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95],
    impliedVol: 68.4,
    contractSize: 5,   // testnet only — reduced for demo — ~$74 exposure at $0.74
  },
  {
    id: 'deep-usdc',
    name: 'DEEP/USDC',
    symbol: 'DEEP',
    price: 0.121,
    change24h: -2.18,
    openInterest: 2740000,
    volume24h: 8910000,
    liquidity: 4100000,
    strikes: [0.09, 0.10, 0.11, 0.12, 0.13, 0.14],
    impliedVol: 82.1,
    contractSize:50,  // 1 contract = 1000 DEEP — ~$121 exposure at $0.121
  },
  {
    id: 'cetus-usdc',
    name: 'CETUS/USDC',
    symbol: 'CETUS',
    price: 0.256,
    change24h: 6.71,
    openInterest: 1980000,
    volume24h: 6430000,
    liquidity: 3800000,
    strikes: [0.14, 0.16, 0.18, 0.20, 0.22, 0.24],
    impliedVol: 74.9,
    contractSize: 25,   // 1 contract = 500 CETUS — ~$128 exposure at $0.256
  },
]

export const EXPIRIES = [
  { label: 'Jun 20', date: '2026-06-20', daysLeft: 13 },
  { label: 'Jun 27', date: '2026-06-27', daysLeft: 20 },
  { label: 'Jul 4', date: '2026-07-04', daysLeft: 27 },
]

export const ORDER_BOOK = {
  asks: [
    { price: 1.97, size: 12840, total: 78329 },
    { price: 1.96, size: 8230, total: 66440 },
    { price: 1.95, size: 15620, total: 57280 },
    { price: 1.94, size: 9410, total: 41630 },
    { price: 1.93, size: 13050, total: 32220 },
    { price: 1.92, size: 6800, total: 19170 },
    { price: 1.91, size: 4200, total: 12370 },
    { price: 1.90, size: 8170, total: 8170 },
  ],
  markPrice: 1.89,
  bids: [
    { price: 1.88, size: 11230, total: 11230 },
    { price: 1.87, size: 14780, total: 26010 },
    { price: 1.86, size: 16420, total: 42430 },
    { price: 1.85, size: 12640, total: 55070 },
    { price: 1.84, size: 17210, total: 72280 },
    { price: 1.83, size: 9840, total: 82120 },
    { price: 1.82, size: 14300, total: 96420 },
    { price: 1.81, size: 7620, total: 104040 },
  ],
}

export const RECENT_TRADES = [
  { price: 1.89, size: 2349, time: '12:45:32', side: 'buy' },
  { price: 1.88, size: 1120, time: '12:45:21', side: 'sell' },
  { price: 1.89, size: 3580, time: '12:45:10', side: 'buy' },
  { price: 1.90, size: 890,  time: '12:44:59', side: 'buy' },
  { price: 1.88, size: 4210, time: '12:44:48', side: 'sell' },
  { price: 1.89, size: 1560, time: '12:44:37', side: 'buy' },
  { price: 1.87, size: 2780, time: '12:44:09', side: 'sell' },
  { price: 1.89, size: 650,  time: '12:44:42', side: 'buy' },
]

export const OPEN_POSITIONS = [
  {
    id: 'pos-1',
    market: 'SUI/USDC',
    type: 'CALL',
    strike: 2.00,
    expiry: 'Jun 20',
    qty: 10,
    premium: 0.42,
    currentValue: 0.672,
    pnl: 26.35,
    pnlPct: 62.7,
  },
  {
    id: 'pos-2',
    market: 'SUI/USDC',
    type: 'PUT',
    strike: 1.80,
    expiry: 'Jun 20',
    qty: 5,
    premium: 0.31,
    currentValue: 0.155,
    pnl: -8.12,
    pnlPct: -52.4,
  },
]

export const EXPIRED_POSITIONS = [
  {
    id: 'exp-1',
    market: 'SUI/USDC',
    type: 'CALL',
    strike: 1.70,
    expiry: 'Jun 06',
    premium: 0.25,
    pnl: 15.80,
    settled: true,
  },
  {
    id: 'exp-2',
    market: 'SUI/USDC',
    type: 'PUT',
    strike: 2.10,
    expiry: 'Jun 06',
    premium: 0.26,
    pnl: -26.00,
    settled: false,
  },
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
  { id: 'tx-1', date: 'Jun 11, 12:45', type: 'Buy PUT',            market: 'SUI/USDC',   strike: 2.00, expiry: 'Jun 20', qty: 10,   amount: -429.00 },
  { id: 'tx-2', date: 'Jun 10, 18:32', type: 'Liquidity Deposit',  market: '-',           strike: null, expiry: '-',     qty: null, amount: -1000.00 },
  { id: 'tx-3', date: 'Jun 09, 14:11', type: 'Buy CALL',           market: 'SUI/USDC',   strike: 1.80, expiry: 'Jun 20', qty: 5,    amount: -155.00 },
  { id: 'tx-4', date: 'Jun 08, 14:11', type: 'Claim Settlement',   market: 'SUI/USDC',   strike: 1.70, expiry: 'Jun 06', qty: null, amount: 275.85 },
  { id: 'tx-5', date: 'Jun 07, 10:45', type: 'Buy CALL',           market: 'CETUS/USDC', strike: 0.30, expiry: 'Jun 27', qty: 8,    amount: -224.00 },
]

export const SETTLEMENT_HISTORY = [
  { date: 'Jun 06, 2026',  market: 'SUI/USDC',   strike: 0.75, result: 'OTM', payout: 0,     txHash: '0x7a1f...bd2c' },
  { date: 'May 30, 2026',  market: 'SUI/USDC',   strike: 0.80, result: 'ITM', payout: 32.50, txHash: '0x0d2c...e154' },
  { date: 'May 23, 2026',  market: 'CETUS/USDC', strike: 0.20, result: 'ITM', payout: 18.45, txHash: '0x1f9a...b21f' },
]

export const EXPIRING_POSITIONS = [
  { id: 'exp-pos-1', market: 'SUI/USDC', type: 'CALL', strike: 0.75, currentPrice: 0.74, expectedPayout: 0,  qty: 10 },
  { id: 'exp-pos-2', market: 'SUI/USDC', type: 'PUT',  strike: 0.80, currentPrice: 0.74, expectedPayout: 60, qty: 5  },
  { id: 'exp-pos-3', market: 'SUI/USDC', type: 'CALL', strike: 0.70, currentPrice: 0.74, expectedPayout: 40, qty: 8  },
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
  'sui-usdc':   [0.95, 0.88, 0.91, 0.85, 0.79, 0.82, 0.76, 0.73, 0.78, 0.75, 0.72, 0.74],
  'deep-usdc':  [0.145, 0.138, 0.142, 0.128, 0.131, 0.119, 0.124, 0.118, 0.122, 0.125, 0.123, 0.121],
  'cetus-usdc': [0.032, 0.029, 0.031, 0.027, 0.024, 0.021, 0.019, 0.018, 0.020, 0.019, 0.018, 0.018],
}