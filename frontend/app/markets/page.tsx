'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { MARKETS, SPARKLINE_DATA } from '@/lib/dummy-data'
import { formatCurrency, cn } from '@/lib/utils'
import { usePrices } from '@/hooks/usePrices'

function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 100
  const height = 32
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={pathD} stroke={positive ? '#10B981' : '#EF4444'} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function MarketsPage() {
  const { prices } = usePrices()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('volume')

  const marketsWithPrices = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price,
    change24h: m.id === 'sui-usdc' ? prices.sui.change24h : m.id === 'deep-usdc' ? prices.deep.change24h : prices.cetus.change24h,
  }))

  const filtered = marketsWithPrices.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'volume') return b.volume24h - a.volume24h
    if (sortBy === 'oi') return b.openInterest - a.openInterest
    if (sortBy === 'iv') return b.impliedVol - a.impliedVol
    return 0
  })

  return (
    <div className="pt-20 md:pt-24 pb-12 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="mb-6 md:mb-10">
          <h1 className="font-syne font-extrabold text-3xl md:text-5xl text-white mb-2 md:mb-3">Markets</h1>
          <p className="text-text-secondary font-mono text-sm">Options markets on Sui. All prices in USDC.</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="relative w-full md:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="w-full bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-white placeholder-text-secondary focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-secondary text-xs font-mono">Sort by:</span>
            {[
              { label: 'Volume', value: 'volume' },
              { label: 'Open Interest', value: 'oi' },
              { label: 'IV %', value: 'iv' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  sortBy === opt.value ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-secondary hover:border-white/30 hover:text-white'
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Market Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map(market => {
            const positive = market.change24h >= 0
            const sparkData = SPARKLINE_DATA[market.id as keyof typeof SPARKLINE_DATA] || []
            return (
              <div key={market.id} className="card p-5 md:p-6 hover-lift hover:border-primary/20 hover:shadow-glow-indigo group cursor-pointer">
                <div className="mb-4">
                  <SparklineChart data={sparkData} positive={positive} />
                </div>
                <div className="flex items-start justify-between mb-4 md:mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary">
                      {market.symbol[0]}
                    </div>
                    <div>
                      <div className="font-syne font-bold text-white text-base md:text-lg">{market.name}</div>
                      <div className="text-text-secondary text-xs font-mono">{market.symbol}</div>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono', positive ? 'bg-profit/10 text-profit' : 'bg-danger/10 text-danger')}>
                    {positive ? '▲' : '▼'} {Math.abs(market.change24h).toFixed(2)}%
                  </div>
                </div>
                <div className="font-mono text-2xl md:text-3xl text-white mb-4 md:mb-5">${market.price.toFixed(3)}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5">
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1">Open Interest</div>
                    <div className="text-white font-mono text-sm font-medium">{formatCurrency(market.openInterest)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1">24h Volume</div>
                    <div className="text-white font-mono text-sm font-medium">{formatCurrency(market.volume24h)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1">Available Strikes</div>
                    <div className="text-white font-mono text-sm font-medium">{market.strikes.length}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1">Implied Vol</div>
                    <div className="text-primary font-mono text-sm font-medium">{market.impliedVol.toFixed(1)}%</div>
                  </div>
                </div>
                <Link href="/trade">
                  <button className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-mono group-hover:bg-primary/10 group-hover:border-primary flex items-center justify-center gap-2 transition-all">
                    Trade <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}