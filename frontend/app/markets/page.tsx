'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, TrendingUp } from 'lucide-react'
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
      <defs>
        <linearGradient id={`sg-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill={`url(#sg-${positive ? 'g' : 'r'})`} />
      <path d={pathD} stroke={positive ? '#10B981' : '#EF4444'} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function MarketCard({ market, index }: { market: any; index: number }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const positive = market.change24h >= 0
  const sparkData = SPARKLINE_DATA[market.id as keyof typeof SPARKLINE_DATA] || []
  const exposurePerContract = (market.contractSize * market.price).toFixed(0)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setTimeout(() => setVisible(true), index * 100)
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [index])

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'card p-5 md:p-6 cursor-pointer relative overflow-hidden transition-all duration-700',
        'hover:border-primary/30 hover:shadow-glow-indigo group',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      )}
    >
      {/* Animated background glow on hover */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent transition-opacity duration-500',
        hovered ? 'opacity-100' : 'opacity-0'
      )} />

      <div className="relative z-10">
        {/* Sparkline */}
        <div className="mb-4">
          <SparklineChart data={sparkData} positive={positive} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full border flex items-center justify-center font-syne font-bold transition-all duration-300',
              hovered
                ? 'bg-primary/30 border-primary/50 text-white scale-110'
                : 'bg-primary/15 border-primary/20 text-primary'
            )}>
              {market.symbol[0]}
            </div>
            <div>
              <div className="font-syne font-bold text-white text-lg">{market.name}</div>
              <div className="text-text-secondary text-xs font-mono">{market.symbol}</div>
            </div>
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono',
            positive ? 'bg-profit/10 text-profit' : 'bg-danger/10 text-danger'
          )}>
            {positive ? '▲' : '▼'} {Math.abs(market.change24h).toFixed(2)}%
          </div>
        </div>

        {/* Price — animates color on hover */}
        <div className={cn(
          'font-mono text-3xl mb-4 md:mb-5 transition-colors duration-300',
          hovered ? 'text-primary' : 'text-white'
        )}>
          ${market.price.toFixed(3)}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5">
          {[
            { label: 'Open Interest', value: formatCurrency(market.openInterest), color: '' },
            { label: '24h Volume', value: formatCurrency(market.volume24h), color: '' },
            { label: 'Contract Size', value: `${market.contractSize} ${market.symbol}`, color: 'text-primary' },
            { label: 'Exposure / Contract', value: `~$${exposurePerContract}`, color: '' },
            { label: 'Available Strikes', value: `${market.strikes.length}`, color: '' },
            { label: 'Implied Vol', value: `${market.impliedVol.toFixed(1)}%`, color: 'text-primary' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-text-secondary text-xs font-mono mb-1">{stat.label}</div>
              <div className={cn('font-mono text-sm font-medium', stat.color || 'text-white')}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Trade button */}
        <Link href={`/trade?market=${market.id}`}>
          <button className={cn(
            'w-full py-2.5 rounded-xl border text-sm font-mono flex items-center justify-center gap-2 transition-all duration-300',
            hovered
              ? 'bg-gradient-to-r from-primary to-violet-500 border-transparent text-white shadow-glow-indigo'
              : 'border-primary/30 text-primary hover:bg-primary/10'
          )}>
            Trade <ArrowRight size={14} className={cn('transition-transform duration-300', hovered && 'translate-x-1')} />
          </button>
        </Link>
      </div>
    </div>
  )
}

export default function MarketsPage() {
  const { prices } = usePrices()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('volume')
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setHeaderVisible(true), 100)
  }, [])

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
    <div className="pt-24 pb-12 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">

        {/* Header */}
        <div className={cn(
          'mb-6 md:mb-10 transition-all duration-700',
          headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={28} className="text-primary" />
            <h1 className="font-syne font-extrabold text-3xl md:text-5xl text-white">Markets</h1>
          </div>
          <p className="text-text-secondary font-mono text-sm">Options markets on Sui. Premiums and payouts in SUI.</p>
        </div>

        {/* Filter Bar */}
        <div className={cn(
          'flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8 transition-all duration-700 delay-100',
          headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          <div className="relative w-full md:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
              className="w-full bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono text-white placeholder-text-secondary focus:outline-none focus:border-primary/40 transition-all"
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
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  sortBy === opt.value
                    ? 'border-primary bg-primary/15 text-primary shadow-glow-indigo'
                    : 'border-white/10 text-text-secondary hover:border-white/30 hover:text-white'
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Market Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((market, i) => (
            <MarketCard key={market.id} market={market} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}