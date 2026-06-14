'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { ArrowRight, Zap, TrendingUp, Brain, ChevronRight, ChevronDown, Shield, Clock, Layers } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { PLATFORM_STATS, MARKETS, SPARKLINE_DATA } from '@/lib/dummy-data'

// Scroll reveal wrapper
function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right'
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setTimeout(() => setVisible(true), delay)
    }, { threshold: 0.15 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  const transform = visible ? 'translate(0,0)' :
    direction === 'up' ? 'translateY(40px)' :
    direction === 'left' ? 'translateX(-40px)' : 'translateX(40px)'

  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform,
      transition: `opacity 0.7s ease, transform 0.7s ease`,
      transitionDelay: `${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// Animated number counter
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 2000
    const steps = 80
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, value)
      setDisplayed(Math.floor(current))
      if (current >= value) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [started, value])

  return (
    <span ref={ref} className="font-mono">
      {prefix}{displayed >= 1_000_000 ? `${(displayed / 1_000_000).toFixed(1)}M` : displayed.toLocaleString()}{suffix}
    </span>
  )
}

// Sparkline chart
function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 120
  const height = 36
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill={`url(#spark-${positive ? 'g' : 'r'})`} />
      <path d={pathD} stroke={positive ? '#10B981' : '#EF4444'} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// Market card
function MarketCard({ market, delay = 0 }: { market: typeof MARKETS[0]; delay?: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const positive = market.change24h >= 0
  const sparkData = SPARKLINE_DATA[market.id as keyof typeof SPARKLINE_DATA] || []

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setTimeout(() => setVisible(true), delay)
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={cn(
      'card p-5 hover-lift hover:border-primary/20 hover:shadow-glow-indigo cursor-pointer group transition-all duration-700',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold group-hover:bg-primary/30 transition-all">
              {market.symbol[0]}
            </div>
            <span className="font-syne font-semibold text-white">{market.name}</span>
          </div>
          <div className="font-mono text-2xl text-white">${market.price.toFixed(3)}</div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono ${positive ? 'bg-profit/10 text-profit' : 'bg-danger/10 text-danger'}`}>
          {positive ? '▲' : '▼'} {Math.abs(market.change24h).toFixed(2)}%
        </div>
      </div>
      <div className="mb-4">
        <SparklineChart data={sparkData} positive={positive} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-text-secondary text-xs mb-1">Open Interest</div>
          <div className="font-mono text-sm text-white">{formatCurrency(market.openInterest)}</div>
        </div>
        <div>
          <div className="text-text-secondary text-xs mb-1">24h Volume</div>
          <div className="font-mono text-sm text-white">{formatCurrency(market.volume24h)}</div>
        </div>
      </div>
      <Link href={`/trade?market=${market.id}`}>
        <button className="w-full py-2 rounded-xl border border-primary/30 text-primary text-sm font-mono group-hover:bg-primary/10 group-hover:border-primary transition-all flex items-center justify-center gap-2">
          Trade Now <ArrowRight size={14} />
        </button>
      </Link>
    </div>
  )
}

// Terminal animation
function TerminalAnimation({ price }: { price: number }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const lines = [
    { text: '> Fetching SUI/USDC options...', color: 'text-text-secondary' },
    { text: `✓ Mark Price: $${price > 0 ? price.toFixed(3) : '0.737'}`, color: 'text-profit' },
    { text: '> Running AI pricing model...', color: 'text-text-secondary' },
    { text: '💡 CALL $0.80 — 34% chance of profit', color: 'text-primary' },
    { text: '> Breakeven: $0.76', color: 'text-text-secondary' },
    { text: '> Risk level: Medium', color: 'text-text-secondary' },
    { text: '> IV: 68.4%', color: 'text-text-secondary' },
  ]

  useEffect(() => {
    setVisibleLines(0)
    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= lines.length) { clearInterval(timer); return prev }
        return prev + 1
      })
    }, 600)
    return () => clearInterval(timer)
  }, [price])

  return (
    <div className="space-y-2 font-mono text-sm min-h-[200px]">
      {lines.slice(0, visibleLines).map((line, i) => (
        <div key={i} className={cn(line.color, 'transition-all animate-fadeIn')}>
          {line.text}
          {i === visibleLines - 1 && visibleLines < lines.length && (
            <span className="animate-pulse ml-1">|</span>
          )}
        </div>
      ))}
      {visibleLines >= lines.length && (
        <div className="mt-4 p-3 rounded-lg bg-profit/10 border border-profit/20 animate-fadeIn">
          <div className="text-profit font-bold">Position P&L: +$0.042 (+12.3%)</div>
        </div>
      )}
    </div>
  )
}

// Floating orb
function FloatingOrb({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('absolute rounded-full blur-[120px] animate-float pointer-events-none', className)} style={style} />
  )
}

// FAQ item
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <ScrollReveal delay={index * 80}>
      <div className={cn(
        'border border-white/8 rounded-xl overflow-hidden transition-all duration-300',
        open ? 'border-primary/30 bg-primary/5' : 'hover:border-white/15'
      )}>
        <button onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-6 py-5 text-left">
          <span className="font-syne font-semibold text-white text-base">{q}</span>
          <ChevronDown size={18} className={cn('text-text-secondary flex-shrink-0 ml-4 transition-transform duration-300', open && 'rotate-180 text-primary')} />
        </button>
        {open && (
          <div className="px-6 pb-5 text-text-secondary font-mono text-sm leading-relaxed border-t border-white/5">
            <div className="pt-4">{a}</div>
          </div>
        )}
      </div>
    </ScrollReveal>
  )
}

export default function LandingPage() {
  const { prices } = usePrices()
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100) }, [])

  const marketsWithPrices = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price,
    change24h: m.id === 'sui-usdc' ? prices.sui.change24h : m.id === 'deep-usdc' ? prices.deep.change24h : prices.cetus.change24h,
  }))

  const suiPrice = prices.sui.price > 0 ? prices.sui.price : 0.742
  const strikes = [
    (suiPrice * 0.92).toFixed(3),
    (suiPrice * 0.96).toFixed(3),
    (suiPrice * 1.00).toFixed(3),
    (suiPrice * 1.04).toFixed(3),
    (suiPrice * 1.08).toFixed(3),
  ]

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-hero-gradient" />
        <FloatingOrb className="top-1/4 left-1/4 w-96 h-96 bg-primary/15 animate-pulse" />
        <FloatingOrb className="bottom-1/4 right-1/4 w-80 h-80 bg-profit/8" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <FloatingOrb className="top-1/2 right-1/3 w-64 h-64 bg-violet-500/8" style={{ animationDelay: '2s', animationDuration: '6s' }} />

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div>
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6 md:mb-8 transition-all duration-700',
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
              Live on Sui Testnet
            </div>

            <div className={cn('transition-all duration-700 delay-100', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
              <h1 className="font-syne font-extrabold text-4xl md:text-7xl leading-none mb-4 md:mb-6">
                <span className="gradient-text">Hedge smarter.</span>
                <br />
                <span className="text-white">Trade better.</span>
              </h1>
            </div>

            <div className={cn('transition-all duration-700 delay-200', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
              <p className="text-text-secondary text-base md:text-lg font-mono leading-relaxed mb-8 md:mb-10 max-w-lg">
                The first native options protocol on Sui. Real Move objects. Real settlement. Real AI.
              </p>
            </div>

            <div className={cn('transition-all duration-700 delay-300', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 md:mb-12">
                <Link href="/trade" className="w-full sm:w-auto">
                  <button className="w-full px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-mono font-medium hover:shadow-glow-indigo hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                    Start Trading <ArrowRight size={16} />
                  </button>
                </Link>
                <Link href="/liquidity" className="w-full sm:w-auto">
                  <button className="w-full px-8 py-3.5 rounded-xl border border-white/15 text-white font-mono hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
                    Provide Liquidity
                  </button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                {[
                  { label: 'Security Audited', icon: '🔒' },
                  { label: 'Pyth Oracle', icon: '⚡' },
                  { label: 'Non-custodial', icon: '🔑' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="text-text-secondary text-xs font-mono">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className={cn(
            'relative mt-4 md:mt-0 transition-all duration-700 delay-200',
            heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          )}>
            <div className="card p-4 md:p-6 relative border-primary/20 shadow-glow-indigo">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-profit" />
                <span className="ml-2 text-text-secondary text-xs font-mono">volara.terminal</span>
              </div>
              <TerminalAnimation price={prices.sui.price} />
            </div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-profit/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-secondary animate-bounce">
          <span className="text-xs font-mono">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-text-secondary to-transparent" />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-6 border-y border-white/5 bg-card/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-profit/5" />
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 relative z-10">
          {[
            { label: 'Target Volume', value: PLATFORM_STATS.totalVolume, prefix: '$' },
            { label: 'Target OI', value: PLATFORM_STATS.openInterest, prefix: '$' },
            { label: 'Target Liquidity', value: PLATFORM_STATS.totalLiquidity, prefix: '$' },
            { label: 'Target Traders', value: PLATFORM_STATS.activeTraders, prefix: '' },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="text-text-secondary text-xs font-mono mb-1 md:mb-2 uppercase tracking-wider">{stat.label}</div>
              <div className="font-syne font-bold text-2xl md:text-3xl text-white group-hover:text-primary transition-colors">
                <AnimatedCounter value={stat.value} prefix={stat.prefix} />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-4 text-yellow-400/50 font-mono text-xs">
          Projected metrics at scale — testnet currently live
        </div>
      </section>

      {/* ── FEATURED MARKETS ── */}
      <section className="py-12 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div>
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-1 md:mb-2">Featured Markets</h2>
              <p className="text-text-secondary font-mono text-sm">Most active options markets on Sui</p>
            </div>
            <Link href="/markets" className="flex items-center gap-1 md:gap-2 text-primary font-mono text-sm hover:gap-3 transition-all flex-shrink-0">
              View all <ChevronRight size={16} />
            </Link>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {marketsWithPrices.map((market, i) => (
            <MarketCard key={market.id} market={market} delay={i * 150} />
          ))}
        </div>
      </section>

      {/* ── LIVE OPTIONS CHAIN PREVIEW ── */}
      <section className="py-12 md:py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8 md:mb-10">
              <div>
                <div className="text-primary font-mono text-xs mb-2 uppercase tracking-wider">Live Preview</div>
                <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-1 md:mb-2">Options Chain — SUI/USDC</h2>
                <p className="text-text-secondary font-mono text-sm">Real strikes generated around live price. Click any row to trade.</p>
              </div>
              <Link href="/trade" className="hidden md:flex items-center gap-2 text-primary font-mono text-sm hover:gap-3 transition-all">
                Open Terminal <ArrowRight size={16} />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="card overflow-hidden border-primary/10">
              {/* Header */}
              <div className="grid grid-cols-7 gap-2 px-4 md:px-6 py-3 border-b border-white/5 bg-card/50 text-xs font-mono text-text-secondary">
                <span className="text-profit">CALL Bid</span>
                <span className="text-profit">CALL Ask</span>
                <span className="text-profit">Delta</span>
                <span className="text-center text-white font-bold">Strike</span>
                <span className="text-danger">Delta</span>
                <span className="text-danger">PUT Bid</span>
                <span className="text-danger text-right">PUT Ask</span>
              </div>
              {strikes.map((strike, i) => {
                const s = parseFloat(strike)
                const isATM = i === 2
                const isITMCall = s < suiPrice
                const callBid = (Math.max(0.001, (suiPrice - s) * 0.95 + 0.01 + i * 0.003)).toFixed(4)
                const callAsk = (parseFloat(callBid) * 1.05).toFixed(4)
                const putBid = (Math.max(0.001, (s - suiPrice) * 0.95 + 0.01 + (4 - i) * 0.003)).toFixed(4)
                const putAsk = (parseFloat(putBid) * 1.05).toFixed(4)
                const callDelta = (0.8 - i * 0.15).toFixed(2)
                const putDelta = (-0.2 - i * 0.15).toFixed(2)
                return (
                  <Link key={strike} href={`/trade?market=sui-usdc`}>
                    <div className={cn(
                      'grid grid-cols-7 gap-2 px-4 md:px-6 py-3.5 border-b border-white/5 cursor-pointer transition-all duration-200 text-sm font-mono',
                      isATM ? 'bg-primary/8 border-primary/20' : isITMCall ? 'bg-profit/3' : '',
                      'hover:bg-primary/10'
                    )}>
                      <span className="text-profit">{callBid}</span>
                      <span className="text-profit/70">{callAsk}</span>
                      <span className={cn(isITMCall ? 'text-profit font-bold' : 'text-text-secondary')}>{callDelta}</span>
                      <span className={cn('text-center font-bold', isATM ? 'text-primary' : 'text-white')}>
                        ${strike}
                        {isATM && <span className="ml-1 text-primary text-xs">ATM</span>}
                      </span>
                      <span className="text-text-secondary">{putDelta}</span>
                      <span className="text-danger/70">{putBid}</span>
                      <span className="text-danger text-right">{putAsk}</span>
                    </div>
                  </Link>
                )
              })}
              <div className="px-4 md:px-6 py-3 bg-card/30 flex items-center justify-between">
                <span className="text-text-secondary font-mono text-xs">Spot: <span className="text-white">${suiPrice.toFixed(4)}</span> · Expiry: Next Friday 12:00 UTC</span>
                <Link href="/trade" className="text-primary font-mono text-xs hover:underline flex items-center gap-1">
                  Full chain <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <h2 className="font-syne font-bold text-2xl md:text-4xl text-center text-white mb-10 md:mb-16">How It Works</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
          {[
            { step: 1, title: 'Choose Your Option', desc: 'Select CALL or PUT on SUI, DEEP, or CETUS. Pick your strike price from the live options chain and choose your expiry.', icon: '🎯', detail: 'CALL · PUT · 6 strikes · Weekly expiry' },
            { step: 2, title: 'AI Prices the Risk', desc: 'Black-Scholes pricing adjusted for real pool utilization. Volara AI gives you probability estimates and breakeven before you commit.', icon: '🧠', detail: 'Black-Scholes · IV · Pool-adjusted' },
            { step: 3, title: 'Settle Automatically', desc: 'Keeper bot checks every 60 seconds. When expiry arrives, Pyth oracle prices settle everything. Payout lands in your wallet. No action needed.', icon: '⚡', detail: 'Pyth oracle · Keeper bot · Auto-payout' },
          ].map((item, i) => (
            <ScrollReveal key={item.step} delay={i * 150} direction="up">
              <div className="relative text-center group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 md:mb-6 group-hover:shadow-glow-indigo group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  {item.icon}
                </div>
                <div className="font-mono text-primary text-xs mb-2">STEP {item.step}</div>
                <h3 className="font-syne font-bold text-lg md:text-xl text-white mb-2 md:mb-3">{item.title}</h3>
                <p className="text-text-secondary font-mono text-sm leading-relaxed mb-3">{item.desc}</p>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/8 border border-primary/15 text-primary font-mono text-xs">{item.detail}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── THE SUI ADVANTAGE ── */}
      <section className="py-12 md:py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <ScrollReveal>
            <div className="text-center mb-10 md:mb-16">
              <div className="text-primary font-mono text-xs mb-3 uppercase tracking-wider">Why Sui</div>
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4">Options that actually belong to you.</h2>
              <p className="text-text-secondary font-mono text-sm max-w-xl mx-auto leading-relaxed">
                On Ethereum, your option is a number in a mapping. On Volara, it's a Move object in your wallet — with its own ID, transferable, composable, and verifiable on Suiscan.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* EVM vs Sui comparison */}
            <ScrollReveal direction="left">
              <div className="card p-6 border-danger/10 opacity-70">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-lg">⟠</div>
                  <div>
                    <div className="text-danger font-mono text-xs font-bold">EVM / ETHEREUM</div>
                    <div className="text-white font-syne font-semibold">Old Way</div>
                  </div>
                </div>
                <div className="bg-background/80 rounded-xl p-4 mb-4 font-mono text-xs">
                  <div className="text-text-secondary">// options.sol</div>
                  <div className="text-purple-400 mt-2">mapping(address =&gt; mapping(uint =&gt; uint))</div>
                  <div className="text-purple-400 ml-4">public balances;</div>
                  <div className="text-text-secondary mt-2">// your "position":</div>
                  <div className="text-danger mt-1">balances[0x742d..][1] = 10</div>
                </div>
                <ul className="space-y-2 text-sm font-mono">
                  {['Just a number in a mapping', 'Not natively transferable', 'Sequential execution only', 'Platform can be upgraded away'].map(t => (
                    <li key={t} className="flex items-center gap-2 text-danger/80"><span>✗</span>{t}</li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={100}>
              <div className="card p-6 border-profit/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-profit/10 flex items-center justify-center text-lg">⬡</div>
                  <div>
                    <div className="text-profit font-mono text-xs font-bold">SUI / MOVE</div>
                    <div className="text-white font-syne font-semibold">Volara Way</div>
                  </div>
                </div>
                <div className="bg-background/80 rounded-xl p-4 mb-4 font-mono text-xs">
                  <div className="text-text-secondary">// options.move</div>
                  <div className="text-blue-400 mt-2">public struct OptionPosition</div>
                  <div className="text-blue-400 ml-4">has key, store {'{'}</div>
                  <div className="text-profit ml-8">id: UID,</div>
                  <div className="text-profit ml-8">strike: u64,</div>
                  <div className="text-profit ml-8">contract_size: u64,</div>
                  <div className="text-blue-400 ml-4">{'}'}</div>
                </div>
                <ul className="space-y-2 text-sm font-mono">
                  {['Real Move object in your wallet', 'Natively transferable', 'Parallel execution', 'Verifiable on Suiscan right now'].map(t => (
                    <li key={t} className="flex items-center gap-2 text-profit"><span>✓</span>{t}</li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>

          {/* Sui features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '⚡', title: 'Sub-second Finality', desc: 'Options settle the instant expiry hits. No waiting for block confirmations.' },
              { icon: '🔀', title: 'Parallel Execution', desc: "Sui's object model enables multiple options trades to execute simultaneously." },
              { icon: '🔗', title: 'Composable', desc: 'Each option object can plug into any other Sui protocol — DeFi lego blocks.' },
              { icon: '🔍', title: 'Fully Verifiable', desc: 'Every position, every settlement, every premium — all on-chain and auditable.' },
            ].map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 100}>
                <div className="card p-4 md:p-5 text-center hover:border-primary/20 hover:shadow-glow-indigo transition-all duration-300 group h-full">
                  <div className="text-2xl md:text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                  <div className="font-syne font-bold text-sm md:text-base text-white mb-2">{f.title}</div>
                  <div className="text-text-secondary font-mono text-xs leading-relaxed">{f.desc}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY VOLARA ── */}
      <section className="py-12 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-8 md:mb-12">Why Volara?</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            {
              icon: <Brain className="text-primary" size={24} />,
              title: 'AI-Assisted Analysis',
              desc: 'Volara AI interprets risk, estimates profit probability, and explains every trade in plain English. Black-Scholes powers the math.',
              gradient: 'from-primary/10 to-violet-500/5',
            },
            {
              icon: <Zap className="text-profit" size={24} />,
              title: 'Instant Settlement',
              desc: "Sui's sub-second finality means options settle the moment they expire. Payout goes directly to your wallet. No waiting, no custodians.",
              gradient: 'from-profit/10 to-primary/5',
            },
            {
              icon: <TrendingUp className="text-primary" size={24} />,
              title: 'Real Move Objects',
              desc: 'Each option is a native Move object in your wallet — not a balance in a mapping. Transferable, composable, verifiable on Suiscan.',
              gradient: 'from-violet-500/10 to-primary/5',
            },
          ].map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 150}>
              <div className={cn(
                'card p-6 hover-lift hover:border-primary/30 group relative overflow-hidden transition-all duration-300 h-full bg-gradient-to-br',
                feature.gradient
              )}>
                <div className="absolute inset-0 bg-card opacity-80 group-hover:opacity-70 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-card border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-primary/30 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-syne font-bold text-lg md:text-xl text-white mb-3">{feature.title}</h3>
                  <p className="text-text-secondary font-mono text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── PROTOCOL SPECS ── */}
      <section className="py-12 md:py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
            <ScrollReveal direction="left">
              <div>
                <div className="text-primary font-mono text-xs mb-3 uppercase tracking-wider">Under the hood</div>
                <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4">Protocol Specifications</h2>
                <p className="text-text-secondary font-mono text-sm leading-relaxed mb-6">
                  Five Move smart contracts. A permissionless keeper. An oracle you can verify. Every parameter is on-chain and auditable.
                </p>
                <Link href="https://github.com/semi1390/volara" target="_blank">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white font-mono text-sm hover:border-primary/40 hover:bg-primary/5 transition-all">
                    View on GitHub <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={100}>
              <div className="card p-6 space-y-0 border-primary/10">
                {[
                  { label: 'Chain', value: 'Sui Network (L1)', icon: '⬡' },
                  { label: 'Language', value: 'Move 2024', icon: '📝' },
                  { label: 'Oracle', value: 'Pyth Network', icon: '🔮' },
                  { label: 'Settlement', value: 'Cash-settled, automated', icon: '⚡' },
                  { label: 'Keeper', value: 'Railway — checks every 60s', icon: '🤖' },
                  { label: 'Expiry', value: 'Weekly — every Friday 12:00 UTC', icon: '📅' },
                  { label: 'Markets', value: 'SUI, DEEP, CETUS', icon: '📊' },
                  { label: 'Smart Contracts', value: '5 audited Move modules', icon: '🔐' },
                  { label: 'Pool Utilization Cap', value: '70% max', icon: '🛡️' },
                  { label: 'Status', value: 'Live on Testnet', icon: '🟢' },
                ].map((row, i) => (
                  <div key={row.label} className={cn(
                    'flex items-center justify-between py-3 font-mono text-sm',
                    i < 9 && 'border-b border-white/5'
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-base">{row.icon}</span>
                      <span className="text-text-secondary">{row.label}</span>
                    </div>
                    <span className="text-white font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── AI SHOWCASE ── */}
      <section className="py-12 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <ScrollReveal direction="left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
                <Brain size={12} /> Powered by Volara AI
              </div>
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4 md:mb-6">AI That Trades With You</h2>
              <p className="text-text-secondary font-mono text-sm leading-relaxed mb-6 md:mb-8">
                Every trade comes with probability estimates, breakeven calculations, and plain-English analysis — powered by real pool data and live prices. Not a chatbot. Context-aware options intelligence.
              </p>
              <Link href="/insights">
                <button className="px-6 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-mono text-sm hover:bg-primary/25 hover:shadow-glow-indigo transition-all">
                  Explore AI Insights →
                </button>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={100}>
            <div className="space-y-3 md:space-y-4">
              {[
                { text: 'This PUT has a 62% chance of expiring ITM.', detail: 'Based on current IV of 68% and 13 days to expiry.' },
                { text: 'Breakeven for this CALL is $0.76.', detail: 'Current price $0.737 + $0.023 premium paid.' },
                { text: 'Risk level: Medium. IV elevated ahead of settlement Friday.', detail: 'Pool utilization at 32% — base pricing in effect.' },
              ].map((item, i) => (
                <div key={i} className="ai-box p-3 md:p-4 hover:border-primary/30 transition-all duration-300 hover:shadow-glow-indigo">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">💡</span>
                    <div>
                      <div className="text-white font-mono text-xs md:text-sm mb-1">{item.text}</div>
                      <div className="text-text-secondary font-mono text-xs">{item.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-12 md:py-20 bg-card/20 border-y border-white/5">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <ScrollReveal>
            <div className="text-center mb-10 md:mb-14">
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-3">Common Questions</h2>
              <p className="text-text-secondary font-mono text-sm">Everything you need to know before your first trade.</p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {[
              {
                q: 'What happens when my option expires?',
                a: 'A keeper bot runs every 60 seconds on Railway. When expiry hits, it calls the permissionless settle function. Pyth Network provides the final price. If your option is in the money, the payout is calculated as (settlement price - strike) × contract size × quantity and sent directly to your wallet. No claim needed.',
              },
              {
                q: 'Can I lose more than the premium I paid?',
                a: 'No. Options buyers have limited downside. The maximum you can lose is the premium you paid. Your upside is theoretically unlimited for CALLs (capped by the pool for PUTs). This is the core value proposition of options — asymmetric risk.',
              },
              {
                q: 'What is a Move object and why does it matter?',
                a: 'On EVM chains, your position is just a number in a contract\'s storage mapping. On Sui, your option is a first-class Move object with its own unique ID, owned by your address. It\'s as real as a token in your wallet — transferable, composable with other Sui protocols, and verifiable on Suiscan.',
              },
              {
                q: 'How is the premium calculated?',
                a: 'Premiums use Black-Scholes pricing with live implied volatility per market, days to expiry, and the current pool utilization. Higher pool utilization means slightly higher premiums — the protocol automatically prices in counterparty risk. You can see the exact formula in the open-source contracts on GitHub.',
              },
              {
                q: 'Who is the counterparty?',
                a: 'The liquidity pool is the counterparty. Liquidity providers deposit SUI into the pool, earn 100% of premiums collected, and bear the risk of paying out in-the-money options. The pool has a 70% utilization cap enforced on-chain to ensure it can always cover payouts.',
              },
              {
                q: 'Is this audited?',
                a: 'The protocol has been reviewed and an audit report is available in the GitHub repository. As with all testnet software, treat it as experimental. No real funds are at risk on testnet.',
              },
            ].map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-12 md:py-24 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div className="card p-8 md:p-16 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-profit/5" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-profit/10 rounded-full blur-2xl group-hover:bg-profit/20 transition-all duration-500" />
            <div className="relative z-10">
              <h2 className="font-syne font-extrabold text-3xl md:text-5xl text-white mb-3 md:mb-4">Ready to trade smarter?</h2>
              <p className="text-text-secondary font-mono mb-8 md:mb-10 text-sm md:text-base">
                Be among the first traders using native options on Sui.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4">
                <Link href="/trade" className="w-full sm:w-auto">
                  <button className="w-full px-8 md:px-10 py-3.5 md:py-4 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-mono font-medium hover:shadow-glow-indigo hover:scale-[1.02] transition-all text-base md:text-lg">
                    Start Trading
                  </button>
                </Link>
                <Link href="/liquidity" className="w-full sm:w-auto">
                  <button className="w-full px-8 md:px-10 py-3.5 md:py-4 rounded-xl border border-white/15 text-white font-mono hover:border-primary/40 hover:bg-primary/5 transition-all text-base md:text-lg">
                    Provide Liquidity
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 md:py-12 bg-card/20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8 md:mb-10">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Zap size={14} className="text-primary" />
                </div>
                <span className="font-syne font-bold text-xl">Volara</span>
              </div>
              <p className="text-text-secondary font-mono text-sm mb-3 md:mb-4">Hedge smarter. Trade better.</p>
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                <span>Built on</span>
                <span className="text-primary font-bold">⬡ Sui</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-profit inline-block" />
                <span>Sui Testnet · Live</span>
              </div>
            </div>
            {[
              { title: 'Product', links: ['Markets', 'Trade', 'Liquidity', 'Portfolio', 'Settlement', 'AI Insights'] },
              { title: 'Resources', links: ['Documentation', 'GitHub', 'Audit Report', 'Blog'] },
              { title: 'Company', links: ['About', 'Security', 'Careers'] },
              { title: 'Legal', links: ['Terms', 'Privacy', 'Disclaimer'] },
            ].map((col) => (
              <div key={col.title}>
                <div className="font-syne font-semibold text-white mb-3 md:mb-4 text-sm">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-text-secondary font-mono text-xs hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-5 md:pt-6 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <span className="text-text-secondary font-mono text-xs">© 2026 Volara. All rights reserved.</span>
            <div className="flex items-center gap-4">
              {['Twitter', 'Discord', 'GitHub', 'Docs'].map((s) => (
                <a key={s} href="#" className="text-text-secondary font-mono text-xs hover:text-white transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}