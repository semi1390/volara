'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { ArrowRight, Zap, Brain, ChevronRight, ChevronDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { PLATFORM_STATS, MARKETS, SPARKLINE_DATA } from '@/lib/dummy-data'

// ── Scroll reveal ──────────────────────────────────────────────
function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }: {
  children: React.ReactNode; className?: string; delay?: number; direction?: 'up' | 'left' | 'right'
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setVisible(true), delay) }, { threshold: 0.12 })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [delay])
  const t = visible ? 'translate(0,0)' : direction === 'up' ? 'translateY(36px)' : direction === 'left' ? 'translateX(-36px)' : 'translateX(36px)'
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: t, transition: `opacity 0.65s ease, transform 0.65s ease`, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ── Animated counter ───────────────────────────────────────────
function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [d, setD] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    let c = 0; const inc = value / 80
    const t = setInterval(() => { c = Math.min(c + inc, value); setD(Math.floor(c)); if (c >= value) clearInterval(t) }, 25)
    return () => clearInterval(t)
  }, [started, value])
  return <span ref={ref}>{prefix}{d >= 1_000_000 ? `${(d / 1_000_000).toFixed(1)}M` : d.toLocaleString()}</span>
}

// ── Sparkline ──────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const w = 100, h = 32
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - ((v - min) / range) * h }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const color = positive ? '#10B981' : '#EF4444'
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`s${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#s${positive ? 'g' : 'r'})`} />
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

// ── Market card ────────────────────────────────────────────────
function MarketCard({ market, delay = 0 }: { market: any; delay?: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const positive = market.change24h >= 0
  const spark = SPARKLINE_DATA[market.id as keyof typeof SPARKLINE_DATA] || []
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setVisible(true), delay) }, { threshold: 0.15 })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [delay])
  return (
    <div ref={ref} className={cn('card p-5 group cursor-pointer transition-all duration-700 hover:border-primary/25 hover:shadow-glow-indigo hover-lift', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold font-syne group-hover:bg-primary/25 transition-all">{market.symbol[0]}</div>
          <div>
            <div className="font-syne font-semibold text-white text-sm">{market.name}</div>
            <div className="text-text-secondary font-mono text-xs">{market.symbol}</div>
          </div>
        </div>
        <div className={cn('px-2 py-1 rounded-lg text-xs font-mono', positive ? 'bg-profit/10 text-profit' : 'bg-danger/10 text-danger')}>
          {positive ? '▲' : '▼'} {Math.abs(market.change24h).toFixed(2)}%
        </div>
      </div>
      <div className="font-mono text-2xl text-white mb-3">${market.price.toFixed(3)}</div>
      <div className="mb-3"><Sparkline data={spark} positive={positive} /></div>
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
        <div><div className="text-text-secondary mb-0.5">Open Interest</div><div className="text-white">{formatCurrency(market.openInterest)}</div></div>
        <div><div className="text-text-secondary mb-0.5">24h Volume</div><div className="text-white">{formatCurrency(market.volume24h)}</div></div>
      </div>
      <Link href={`/trade?market=${market.id}`}>
        <button className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-mono group-hover:bg-primary/10 group-hover:border-primary transition-all flex items-center justify-center gap-2">
          Trade Now <ArrowRight size={13} />
        </button>
      </Link>
    </div>
  )
}

// ── Terminal ───────────────────────────────────────────────────
function Terminal({ price }: { price: number }) {
  const [n, setN] = useState(0)
  const lines = [
    { t: '> Fetching SUI/USDC options...', c: 'text-text-secondary' },
    { t: `✓ Mark Price: $${price > 0 ? price.toFixed(3) : '0.742'}`, c: 'text-profit' },
    { t: '> Running AI pricing model...', c: 'text-text-secondary' },
    { t: '💡 CALL $0.80 — 34% profit probability', c: 'text-primary' },
    { t: '> Breakeven: $0.763', c: 'text-text-secondary' },
    { t: '> IV: 68.4% · Risk: Medium', c: 'text-text-secondary' },
  ]
  useEffect(() => {
    setN(0)
    const t = setInterval(() => setN(p => { if (p >= lines.length) { clearInterval(t); return p } return p + 1 }), 650)
    return () => clearInterval(t)
  }, [price])
  return (
    <div className="space-y-2 font-mono text-sm min-h-[180px]">
      {lines.slice(0, n).map((l, i) => (
        <div key={i} className={cn(l.c, 'animate-fadeIn')}>
          {l.t}{i === n - 1 && n < lines.length && <span className="animate-pulse ml-1">|</span>}
        </div>
      ))}
      {n >= lines.length && (
        <div className="mt-3 p-3 rounded-xl bg-profit/10 border border-profit/20 animate-fadeIn">
          <div className="text-profit font-bold text-sm">Position P&L: +$0.042 (+12.3%)</div>
        </div>
      )}
    </div>
  )
}

// ── Countdown ──────────────────────────────────────────────────
function MiniCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const next = new Date()
      next.setUTCDate(now.getUTCDate() + ((5 - now.getUTCDay() + 7) % 7 || 7))
      next.setUTCHours(12, 0, 0, 0)
      const diff = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
      setTime({ h: Math.floor(diff / 3600) % 24, m: Math.floor(diff / 60) % 60, s: diff % 60 })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-white/10">
      <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
      <span className="text-text-secondary font-mono text-xs">Next settlement:</span>
      <span className="text-white font-mono text-xs font-bold">{pad(time.h)}h {pad(time.m)}m {pad(time.s)}s</span>
    </div>
  )
}

// ── FAQ ────────────────────────────────────────────────────────
function FAQ({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false)
  return (
    <ScrollReveal delay={i * 70}>
      <div className={cn('border rounded-xl overflow-hidden transition-all duration-300', open ? 'border-primary/30 bg-primary/5' : 'border-white/8 hover:border-white/15')}>
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
          <span className="font-syne font-semibold text-white text-sm md:text-base">{q}</span>
          <ChevronDown size={16} className={cn('text-text-secondary flex-shrink-0 transition-transform duration-300', open && 'rotate-180 text-primary')} />
        </button>
        {open && (
          <div className="px-5 pb-4 text-text-secondary font-mono text-sm leading-relaxed border-t border-white/5 pt-4">
            {a}
          </div>
        )}
      </div>
    </ScrollReveal>
  )
}

// ── Floating orb ───────────────────────────────────────────────
function Orb({ className, style }: { className: string; style?: React.CSSProperties }) {
  return <div className={cn('absolute rounded-full blur-[120px] pointer-events-none', className)} style={style} />
}

// ── Main ───────────────────────────────────────────────────────
export default function LandingPage() {
  const { prices } = usePrices()
  const [heroVisible, setHeroVisible] = useState(false)
  useEffect(() => { setTimeout(() => setHeroVisible(true), 100) }, [])

  const markets = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price || m.price : m.id === 'deep-usdc' ? prices.deep.price || m.price : prices.cetus.price || m.price,
    change24h: m.id === 'sui-usdc' ? prices.sui.change24h : m.id === 'deep-usdc' ? prices.deep.change24h : prices.cetus.change24h,
  }))

  const suiPrice = prices.sui.price > 0 ? prices.sui.price : 0.742
  const strikes = [-0.08, -0.04, 0, 0.04, 0.08].map(d => (suiPrice * (1 + d)).toFixed(3))

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-20 md:pt-24 pb-16">
        <div className="absolute inset-0 bg-grid opacity-25" />
        <div className="absolute inset-0 bg-hero-gradient" />
        <Orb className="top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-primary/12 animate-pulse" />
        <Orb className="bottom-1/3 right-1/4 w-48 h-48 md:w-72 md:h-72 bg-profit/6" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Left */}
            <div>
              {/* Live badge */}
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-5 transition-all duration-700', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
                Live on Sui Testnet
              </div>

              {/* Headline */}
              <div className={cn('transition-all duration-700 delay-100', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
                <h1 className="font-syne font-extrabold text-[clamp(2.5rem,8vw,5rem)] leading-[1.05] mb-5">
                  <span className="gradient-text">Options trading,</span>
                  <br />
                  <span className="text-white">finally on Sui.</span>
                </h1>
              </div>

              {/* Subhead */}
              <div className={cn('transition-all duration-700 delay-200', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
                <p className="text-text-secondary text-base md:text-lg font-mono leading-relaxed mb-7 max-w-md">
                  Buy CALLs and PUTs on SUI, DEEP, and CETUS. Your option lands in your wallet as a real object — not a promise.
                </p>
              </div>

              {/* CTAs */}
              <div className={cn('transition-all duration-700 delay-300', heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Link href="/trade" className="w-full sm:w-auto">
                    <button className="w-full px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-mono font-semibold hover:shadow-glow-indigo hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                      Start Trading <ArrowRight size={16} />
                    </button>
                  </Link>
                  <Link href="/liquidity" className="w-full sm:w-auto">
                    <button className="w-full px-7 py-3.5 rounded-xl border border-white/15 text-white font-mono hover:border-primary/40 hover:bg-primary/5 transition-all text-center text-sm md:text-base">
                      Provide Liquidity
                    </button>
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[['🔒', 'Non-custodial'], ['⚡', 'Auto-settlement'], ['🧠', 'AI-powered pricing']].map(([icon, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="text-sm">{icon}</span>
                      <span className="text-text-secondary text-xs font-mono">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Terminal */}
            <div className={cn('transition-all duration-700 delay-200', heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8')}>
              <div className="card p-5 md:p-6 border-primary/15 shadow-glow-indigo relative">
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-profit" />
                  <span className="ml-2 text-text-secondary text-xs font-mono">volara.terminal</span>
                </div>
                <Terminal price={prices.sui.price} />
              </div>
              <div className="mt-3 flex justify-center">
                <MiniCountdown />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-text-secondary animate-bounce">
          <span className="text-xs font-mono">Scroll</span>
          <div className="w-px h-6 bg-gradient-to-b from-text-secondary to-transparent" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-5 border-y border-white/5 bg-card/40 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Target Volume', value: PLATFORM_STATS.totalVolume, prefix: '$' },
            { label: 'Target OI', value: PLATFORM_STATS.openInterest, prefix: '$' },
            { label: 'Target Liquidity', value: PLATFORM_STATS.totalLiquidity, prefix: '$' },
            { label: 'Target Traders', value: PLATFORM_STATS.activeTraders, prefix: '' },
          ].map(s => (
            <div key={s.label} className="text-center group">
              <div className="text-text-secondary text-xs font-mono mb-1 uppercase tracking-wider">{s.label}</div>
              <div className="font-syne font-bold text-xl md:text-3xl text-white group-hover:text-primary transition-colors">
                <AnimatedCounter value={s.value} prefix={s.prefix} />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-3 text-yellow-400/40 font-mono text-xs">Projected at scale — testnet live now</div>
      </section>

      {/* ── MARKETS ── */}
      <section className="py-14 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-1">Live Markets</h2>
              <p className="text-text-secondary font-mono text-sm">Options on Sui — premiums paid in SUI</p>
            </div>
            <Link href="/markets" className="flex items-center gap-1 text-primary font-mono text-sm hover:gap-2 transition-all flex-shrink-0">
              All markets <ChevronRight size={15} />
            </Link>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {markets.map((m, i) => <MarketCard key={m.id} market={m} delay={i * 120} />)}
        </div>
      </section>

      {/* ── LIVE OPTIONS CHAIN ── */}
      <section className="py-14 md:py-20 bg-card/25 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-primary font-mono text-xs mb-2 uppercase tracking-widest">Live right now</div>
                <h2 className="font-syne font-bold text-2xl md:text-4xl text-white">SUI/USDC Options Chain</h2>
                <p className="text-text-secondary font-mono text-sm mt-1">Click any strike to open the trade terminal.</p>
              </div>
              <div className="flex items-center gap-2 text-text-secondary font-mono text-xs flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
                Spot: <span className="text-white ml-1">${suiPrice.toFixed(4)}</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div className="card overflow-hidden border-primary/10">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-7 gap-2 px-6 py-3 border-b border-white/5 text-xs font-mono text-text-secondary bg-card/40">
                <span className="text-profit">CALL Bid</span>
                <span className="text-profit">CALL Ask</span>
                <span className="text-profit">Δ Delta</span>
                <span className="text-center text-white font-bold">Strike</span>
                <span className="text-danger">Δ Delta</span>
                <span className="text-danger">PUT Bid</span>
                <span className="text-danger text-right">PUT Ask</span>
              </div>

              {/* Mobile header */}
              <div className="md:hidden grid grid-cols-3 gap-2 px-4 py-2 border-b border-white/5 text-xs font-mono text-text-secondary bg-card/40">
                <span className="text-profit">CALL</span>
                <span className="text-center text-white">Strike</span>
                <span className="text-danger text-right">PUT</span>
              </div>

              {strikes.map((strike, i) => {
                const s = parseFloat(strike)
                const isATM = i === 2
                const isITM = s < suiPrice
                const cBid = Math.max(0.001, (suiPrice - s) * 0.9 + 0.012 + i * 0.002)
                const cAsk = cBid * 1.06
                const pBid = Math.max(0.001, (s - suiPrice) * 0.9 + 0.012 + (4 - i) * 0.002)
                const pAsk = pBid * 1.06
                const cDelta = (0.82 - i * 0.16).toFixed(2)
                const pDelta = (-0.18 - i * 0.16).toFixed(2)
                return (
                  <Link key={strike} href="/trade?market=sui-usdc">
                    {/* Desktop row */}
                    <div className={cn(
                      'hidden md:grid grid-cols-7 gap-2 px-6 py-3.5 border-b border-white/5 cursor-pointer transition-all text-sm font-mono hover:bg-primary/8',
                      isATM && 'bg-primary/6',
                      isITM && !isATM && 'bg-profit/3'
                    )}>
                      <span className="text-profit">{cBid.toFixed(4)}</span>
                      <span className="text-profit/60">{cAsk.toFixed(4)}</span>
                      <span className={isITM ? 'text-profit font-bold' : 'text-text-secondary'}>{cDelta}</span>
                      <span className={cn('text-center font-bold', isATM ? 'text-primary' : 'text-white')}>
                        ${strike}{isATM && <span className="ml-1 text-[10px] text-primary bg-primary/15 px-1 rounded">ATM</span>}
                      </span>
                      <span className="text-text-secondary">{pDelta}</span>
                      <span className="text-danger/60">{pBid.toFixed(4)}</span>
                      <span className="text-danger text-right">{pAsk.toFixed(4)}</span>
                    </div>
                    {/* Mobile row */}
                    <div className={cn(
                      'md:hidden grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/5 cursor-pointer transition-all text-xs font-mono hover:bg-primary/8',
                      isATM && 'bg-primary/6'
                    )}>
                      <span className="text-profit">{cBid.toFixed(4)}</span>
                      <span className={cn('text-center font-bold', isATM ? 'text-primary' : 'text-white')}>
                        ${strike}{isATM && <span className="ml-1 text-[9px] text-primary">ATM</span>}
                      </span>
                      <span className="text-danger text-right">{pBid.toFixed(4)}</span>
                    </div>
                  </Link>
                )
              })}

              <div className="px-4 md:px-6 py-3 bg-card/20 flex items-center justify-between">
                <span className="text-text-secondary font-mono text-xs">Expiry: Next Friday 12:00 UTC · Auto-settled by keeper</span>
                <Link href="/trade" className="text-primary font-mono text-xs hover:underline flex items-center gap-1">Full chain <ArrowRight size={10} /></Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-14 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <h2 className="font-syne font-bold text-2xl md:text-4xl text-center text-white mb-10 md:mb-16">Three steps.</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
          {[
            { n: '01', icon: '🎯', title: 'Pick your position', desc: 'Choose CALL or PUT. Pick a strike from the live options chain. Select your expiry — weekly, every Friday.' },
            { n: '02', icon: '🧠', title: 'See the AI analysis', desc: 'Before you buy, Volara AI shows you the probability of profit, your breakeven price, and a plain-English risk summary.' },
            { n: '03', icon: '⚡', title: 'Settle automatically', desc: 'At expiry, settlement is automatic. No button to press, no claim to file. Payout goes straight to your wallet.' },
          ].map((item, i) => (
            <ScrollReveal key={item.n} delay={i * 130}>
              <div className="relative text-center md:text-left group">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-2xl md:text-3xl mx-auto md:mx-0 mb-4 group-hover:shadow-glow-indigo group-hover:scale-105 group-hover:bg-primary/18 transition-all duration-300">
                  {item.icon}
                </div>
                <div className="font-mono text-primary text-xs mb-1.5">{item.n}</div>
                <h3 className="font-syne font-bold text-lg text-white mb-2">{item.title}</h3>
                <p className="text-text-secondary font-mono text-sm leading-relaxed">{item.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── PHILOSOPHY QUOTE ── */}
      <section className="py-14 md:py-20 bg-card/20 border-y border-white/5">
        <div className="max-w-[700px] mx-auto px-4 md:px-8 text-center">
          <ScrollReveal>
            <div className="text-4xl mb-6">⚡</div>
            <blockquote className="font-syne font-bold text-2xl md:text-4xl text-white leading-tight mb-6">
              "Your position isn't a record in a database.<br />
              <span className="gradient-text">It's an object you own."</span>
            </blockquote>
            <p className="text-text-secondary font-mono text-sm leading-relaxed">
              On Volara, when you buy an option it lands in your wallet as a real asset — with its own unique ID, verifiable on Suiscan, transferable to anyone. That's what makes Sui different. That's what makes Volara possible.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── AI SHOWCASE ── */}
      <section className="py-14 md:py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <ScrollReveal direction="left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-5">
                <Brain size={11} /> Volara AI
              </div>
              <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4">Know your trade before you make it.</h2>
              <p className="text-text-secondary font-mono text-sm leading-relaxed mb-6">
                Every trade comes with probability of profit, breakeven price, and a plain-English risk summary — calculated from live pool data and current volatility. Not a guess. Math.
              </p>
              <Link href="/insights">
                <button className="px-5 py-2.5 rounded-xl bg-primary/12 border border-primary/25 text-primary font-mono text-sm hover:bg-primary/22 hover:shadow-glow-indigo transition-all">
                  Try AI Insights →
                </button>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={80}>
            <div className="space-y-3">
              {[
                { text: 'This PUT has a 62% chance of expiring ITM.', detail: 'Based on current IV of 68% and 13 days to expiry.' },
                { text: 'Breakeven for this CALL is $0.763.', detail: 'Current price $0.737 — needs a 3.5% move.' },
                { text: 'Risk: Medium. Premium is 2.2% of contract exposure.', detail: 'Pool utilization at 32% — base pricing active.' },
              ].map((item, i) => (
                <div key={i} className="ai-box p-4 hover:border-primary/30 hover:shadow-glow-indigo transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5">💡</span>
                    <div>
                      <div className="text-white font-mono text-sm mb-1 leading-snug">{item.text}</div>
                      <div className="text-text-secondary font-mono text-xs">{item.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── LP SECTION ── */}
      <section className="py-14 md:py-20 bg-card/25 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <ScrollReveal direction="left">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Earn', value: '100%', sub: 'of premiums go to LPs' },
                  { label: 'Cap', value: '70%', sub: 'max pool utilization' },
                  { label: 'Lock', value: 'None', sub: 'withdraw anytime' },
                  { label: 'Asset', value: 'SUI', sub: 'deposit and earn in SUI' },
                ].map((s, i) => (
                  <ScrollReveal key={s.label} delay={i * 80}>
                    <div className="card p-4 md:p-5 hover:border-primary/20 transition-all">
                      <div className="text-text-secondary font-mono text-xs mb-1">{s.label}</div>
                      <div className="font-syne font-bold text-2xl md:text-3xl text-white mb-1">{s.value}</div>
                      <div className="text-text-secondary font-mono text-xs leading-tight">{s.sub}</div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={80}>
              <div>
                <div className="text-primary font-mono text-xs mb-3 uppercase tracking-widest">For liquidity providers</div>
                <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-4">Be the house.</h2>
                <p className="text-text-secondary font-mono text-sm leading-relaxed mb-6">
                  Deposit SUI into the Volara pool and earn every premium traders pay. A 70% utilization cap is enforced on-chain — your exposure is always bounded. Withdraw whenever you want.
                </p>
                <Link href="/liquidity">
                  <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-mono text-sm hover:shadow-glow-indigo hover:scale-[1.02] transition-all flex items-center gap-2">
                    Start Earning <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 md:py-20 max-w-[800px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="font-syne font-bold text-2xl md:text-4xl text-white mb-3">Common questions</h2>
            <p className="text-text-secondary font-mono text-sm">Before your first trade.</p>
          </div>
        </ScrollReveal>
        <div className="space-y-2.5">
          {[
            { q: 'What happens when my option expires?', a: 'Settlement is automatic. A keeper bot checks every 60 seconds. When your option expires, it fetches the Pyth oracle price and settles everything on-chain. If you\'re in the money, the payout goes directly to your wallet. You don\'t need to do anything.' },
            { q: 'Can I lose more than the premium I paid?', a: 'No. When you buy an option, your maximum loss is exactly the premium you paid — nothing more. Your upside is theoretically unlimited for CALLs. This is the key advantage of options over perpetuals.' },
            { q: 'What is a contract size?', a: 'Each option controls a fixed number of the underlying asset — the contract size. On Volara testnet, 1 SUI CALL controls 5 SUI. So if SUI moves $0.10 above your strike and you hold 1 contract, your payout is 5 × $0.10 = $0.50 SUI.' },
            { q: 'Who is on the other side of my trade?', a: 'The liquidity pool. LPs deposit SUI and collectively act as the counterparty. They earn your premium upfront. If your option expires in the money, the pool pays your payout. The 70% utilization cap ensures the pool can always cover payouts.' },
            { q: 'Is this safe to use?', a: 'This is testnet software — no real funds are at risk. The contracts have been reviewed and the audit report is available on GitHub. As with all DeFi protocols, use amounts you\'re comfortable with and understand the risks before trading.' },
          ].map((item, i) => <FAQ key={i} q={item.q} a={item.a} i={i} />)}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 md:py-24 max-w-[1440px] mx-auto px-4 md:px-8">
        <ScrollReveal>
          <div className="card p-8 md:p-16 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-violet-500/5" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 to-violet-500/4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl group-hover:bg-primary/15 transition-all duration-500" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-profit/8 rounded-full blur-3xl group-hover:bg-profit/15 transition-all duration-500" />
            <div className="relative z-10">
              <h2 className="font-syne font-extrabold text-2xl md:text-5xl text-white mb-3">Ready?</h2>
              <p className="text-text-secondary font-mono text-sm md:text-base mb-8">
                Options on Sui. First ever. Live now.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <Link href="/trade" className="w-full sm:w-auto">
                  <button className="w-full px-8 md:px-10 py-3.5 md:py-4 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-mono font-semibold hover:shadow-glow-indigo hover:scale-[1.02] active:scale-[0.98] transition-all text-sm md:text-base">
                    Start Trading
                  </button>
                </Link>
                <Link href="/liquidity" className="w-full sm:w-auto">
                  <button className="w-full px-8 md:px-10 py-3.5 md:py-4 rounded-xl border border-white/15 text-white font-mono hover:border-primary/40 hover:bg-primary/5 transition-all text-sm md:text-base">
                    Provide Liquidity
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 md:py-12 bg-card/15">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Zap size={13} className="text-primary" />
                </div>
                <span className="font-syne font-bold text-lg text-white">Volara</span>
              </div>
              <p className="text-text-secondary font-mono text-xs mb-3">Hedge smarter. Trade better.</p>
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                Built on <span className="text-primary font-bold ml-1">⬡ Sui</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-profit inline-block" />
                Testnet · Live
              </div>
            </div>
            {[
              { title: 'Product', links: ['Markets', 'Trade', 'Liquidity', 'Portfolio', 'Settlement', 'AI Insights'] },
              { title: 'Resources', links: ['Documentation', 'GitHub', 'Audit Report'] },
              { title: 'Legal', links: ['Terms', 'Privacy', 'Disclaimer'] },
            ].map(col => (
              <div key={col.title}>
                <div className="font-syne font-semibold text-white mb-3 text-sm">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-text-secondary font-mono text-xs hover:text-white transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-text-secondary font-mono text-xs">© 2026 Volara. Sui Overflow Hackathon.</span>
            <div className="flex items-center gap-4">
              {['Twitter', 'Discord', 'GitHub'].map(s => (
                <a key={s} href="#" className="text-text-secondary font-mono text-xs hover:text-white transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}