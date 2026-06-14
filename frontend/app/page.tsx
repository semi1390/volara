'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { ArrowRight, Zap, TrendingUp, Brain, ChevronRight } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { PLATFORM_STATS, MARKETS, SPARKLINE_DATA } from '@/lib/dummy-data'

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

// Market card with reveal animation
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
    <div
      ref={ref}
      className={cn(
        'card p-5 hover-lift hover:border-primary/20 hover:shadow-glow-indigo cursor-pointer group transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
    >
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

// Floating orb background element
function FloatingOrb({ className, style }: { className: string; style?: React.CSSProperties }) {
return (
  <div
    className={cn('absolute rounded-full blur-[120px] animate-float pointer-events-none', className)}
    style={style}
  />
)
}

export default function LandingPage() {
  const { prices } = usePrices()
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100)
  }, [])

  const marketsWithPrices = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price,
    change24h: m.id === 'sui-usdc' ? prices.sui.change24h : m.id === 'deep-usdc' ? prices.deep.change24h : prices.cetus.change24h,
  }))

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
        {/* Animated background */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-hero-gradient" />
        <FloatingOrb className="top-1/4 left-1/4 w-96 h-96 bg-primary/15 animate-pulse" />
        <FloatingOrb className="bottom-1/4 right-1/4 w-80 h-80 bg-profit/8" style={{ animationDelay: '1s', animationDuration: '4s' } as any} />
        <FloatingOrb className="top-1/2 right-1/3 w-64 h-64 bg-violet-500/8" style={{ animationDelay: '2s', animationDuration: '6s' } as any} />

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left */}
          <div>
            {/* Live badge */}
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6 md:mb-8 transition-all duration-700',
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
              Live on Sui Testnet
            </div>

            {/* Headline */}
            <div className={cn(
              'transition-all duration-700 delay-100',
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
              <h1 className="font-syne font-extrabold text-4xl md:text-7xl leading-none mb-4 md:mb-6">
                <span className="gradient-text">Hedge smarter.</span>
                <br />
                <span className="text-white">Trade better.</span>
              </h1>
            </div>

            {/* Description */}
            <div className={cn(
              'transition-all duration-700 delay-200',
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
              <p className="text-text-secondary text-base md:text-lg font-mono leading-relaxed mb-8 md:mb-10 max-w-lg">
                The first native options protocol on Sui. Real Move objects. Real settlement. Real AI.
              </p>
            </div>

            {/* CTAs */}
            <div className={cn(
              'transition-all duration-700 delay-300',
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
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

          {/* Right — Terminal */}
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
            {/* Glow effects around terminal */}
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-profit/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>

        {/* Scroll indicator */}
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
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-1 md:mb-2">Featured Markets</h2>
            <p className="text-text-secondary font-mono text-sm">Most active options markets on Sui</p>
          </div>
          <Link href="/markets" className="flex items-center gap-1 md:gap-2 text-primary font-mono text-sm hover:gap-3 transition-all flex-shrink-0">
            View all <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {marketsWithPrices.map((market, i) => (
            <MarketCard key={market.id} market={market} delay={i * 150} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 md:py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <h2 className="font-syne font-bold text-2xl md:text-4xl text-center text-white mb-10 md:mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            {[
              { step: 1, title: 'Choose Option', desc: 'Select CALL or PUT options on your favorite Sui assets. Pick your strike price and expiry.', icon: '🎯' },
              { step: 2, title: 'AI Prices Risk', desc: 'Volara AI analyzes volatility, market conditions, and prices fair options with probability estimates.', icon: '🧠' },
              { step: 3, title: 'Auto Settlement', desc: 'Options settle automatically on Sui at expiry. Payout goes directly to your wallet — no intermediaries.', icon: '⚡' },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 md:mb-6 group-hover:shadow-glow-indigo group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  {item.icon}
                </div>
                <div className="font-mono text-primary text-xs mb-2">STEP {item.step}</div>
                <h3 className="font-syne font-bold text-lg md:text-xl text-white mb-2 md:mb-3">{item.title}</h3>
                <p className="text-text-secondary font-mono text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY VOLARA ── */}
      <section className="py-12 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-8 md:mb-12">Why Volara?</h2>
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
          ].map((feature) => (
            <div key={feature.title} className={cn(
              'card p-6 hover-lift hover:border-primary/30 group relative overflow-hidden transition-all duration-300',
              'bg-gradient-to-br',
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
          ))}
        </div>
      </section>

      {/* ── AI SHOWCASE ── */}
      <section className="py-12 md:py-20 bg-card/20 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
              <Brain size={12} /> Powered by Volara AI
            </div>
            <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4 md:mb-6">AI That Trades With You</h2>
            <p className="text-text-secondary font-mono text-sm leading-relaxed mb-6 md:mb-8">
              Every trade comes with probability estimates, breakeven calculations, and plain-English analysis — powered by real pool data and live prices.
            </p>
            <Link href="/insights">
              <button className="px-6 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-mono text-sm hover:bg-primary/25 hover:shadow-glow-indigo transition-all">
                Explore AI Insights →
              </button>
            </Link>
          </div>
          <div className="space-y-3 md:space-y-4">
            {[
              { text: 'This PUT has a 62% chance of expiring ITM.', detail: 'Based on current IV of 68% and 13 days to expiry.' },
              { text: 'Breakeven for this CALL is $0.76.', detail: 'Current price $0.737 + $0.023 premium paid.' },
              { text: 'Risk level: Medium. IV elevated ahead of settlement Friday.', detail: 'Pool utilization at 32% — base pricing in effect.' },
            ].map((item, i) => (
              <div
                key={i}
                className="ai-box p-3 md:p-4 hover:border-primary/30 transition-all duration-300 hover:shadow-glow-indigo"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
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
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-12 md:py-24 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="card p-8 md:p-16 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-profit/5" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* Animated corner glows */}
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
            </div>
            {[
              { title: 'Product', links: ['Markets', 'Trade', 'Liquidity', 'Portfolio', 'Settlement'] },
              { title: 'Resources', links: ['Documentation', 'Guides', 'API', 'Blog'] },
              { title: 'Company', links: ['About', 'Security', 'Audits', 'Careers'] },
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