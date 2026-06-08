'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { ArrowRight, Zap, TrendingUp, Brain, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PLATFORM_STATS, MARKETS, SPARKLINE_DATA } from '@/lib/dummy-data'

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, value)
      setDisplayed(Math.floor(current))
      if (current >= value) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return (
    <span ref={ref} className="font-mono">
      {prefix}{displayed >= 1_000_000 ? `${(displayed / 1_000_000).toFixed(1)}M` : displayed.toLocaleString()}{suffix}
    </span>
  )
}

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

function MarketCard({ market }: { market: typeof MARKETS[0] }) {
  const positive = market.change24h >= 0
  const sparkData = SPARKLINE_DATA[market.id as keyof typeof SPARKLINE_DATA] || []
  return (
    <div className="card p-5 hover-lift hover:border-primary/20 hover:shadow-glow-indigo cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
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
      <Link href="/trade">
        <button className="w-full py-2 rounded-xl border border-primary/30 text-primary text-sm font-mono group-hover:bg-primary/10 group-hover:border-primary transition-all flex items-center justify-center gap-2">
          Trade Now <ArrowRight size={14} />
        </button>
      </Link>
    </div>
  )
}

export default function LandingPage() {
  const { prices } = usePrices()

  const marketsWithPrices = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price,
    change24h: m.id === 'sui-usdc' ? prices.sui.change24h : m.id === 'deep-usdc' ? prices.deep.change24h : prices.cetus.change24h,
  }))

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-profit/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
              Live on Sui Testnet
            </div>
            <h1 className="font-syne font-extrabold text-4xl md:text-7xl leading-none mb-6">
              <span className="gradient-text">Hedge smarter.</span>
              <br />
              <span className="text-white">Trade better.</span>
            </h1>
            <p className="text-text-secondary text-lg font-mono leading-relaxed mb-10 max-w-lg">
              Decentralized options on Sui with AI-powered pricing, instant settlement, and institutional-grade liquidity.
            </p>
            <div className="flex items-center gap-4 mb-12">
              <Link href="/trade">
                <button className="px-8 py-3.5 rounded-xl bg-primary text-white font-mono font-medium hover:shadow-glow-indigo hover:bg-primary/90 transition-all flex items-center gap-2">
                  Start Trading <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/liquidity">
                <button className="px-8 py-3.5 rounded-xl border border-white/15 text-white font-mono hover:border-primary/50 hover:bg-primary/5 transition-all">
                  Provide Liquidity
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-6">
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

          {/* Terminal visual */}
          <div className="relative">
            <div className="card p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-profit" />
                <span className="ml-2 text-text-secondary text-xs font-mono">volara.terminal</span>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="text-text-secondary">{'>'} Fetching SUI/USDC options...</div>
                <div className="text-profit">✓ Mark Price: ${prices.sui.price > 0 ? prices.sui.price.toFixed(3) : '0.737'} <span className="animate-pulse">|</span></div>
                <div className="text-text-secondary">{'>'} Running AI pricing model...</div>
                <div className="text-primary">💡 CALL $0.80 — 34% chance of profit</div>
                <div className="text-text-secondary">{'>'} Breakeven: <span className="text-white">$0.76</span></div>
                <div className="text-text-secondary">{'>'} Risk level: <span className="text-yellow-400">Medium</span></div>
                <div className="text-text-secondary">{'>'} IV: <span className="text-white">68.4%</span></div>
                <div className="mt-4 p-3 rounded-lg bg-profit/10 border border-profit/20">
                  <div className="text-profit font-bold">Position P&L: +$0.042 (+12.3%)</div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-profit/15 rounded-full blur-xl" />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-secondary">
          <span className="text-xs font-mono">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-text-secondary to-transparent" />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-6 border-y border-white/5 bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Total Volume', value: PLATFORM_STATS.totalVolume, prefix: '$' },
            { label: 'Open Interest', value: PLATFORM_STATS.openInterest, prefix: '$' },
            { label: 'Total Liquidity', value: PLATFORM_STATS.totalLiquidity, prefix: '$' },
            { label: 'Active Traders', value: PLATFORM_STATS.activeTraders, prefix: '' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">{stat.label}</div>
              <div className="font-syne font-bold text-3xl text-white">
                <AnimatedCounter value={stat.value} prefix={stat.prefix} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-syne font-bold text-4xl text-white mb-2">Featured Markets</h2>
            <p className="text-text-secondary font-mono text-sm">Most active options markets on Sui</p>
          </div>
          <Link href="/markets" className="flex items-center gap-2 text-primary font-mono text-sm hover:gap-3 transition-all">
            View all markets <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {marketsWithPrices.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <h2 className="font-syne font-bold text-4xl text-center text-white mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
            <div className="absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            {[
              { step: 1, title: 'Choose Option', desc: 'Select CALL or PUT options on your favorite Sui assets. Pick your strike price and expiry.', icon: '🎯' },
              { step: 2, title: 'AI Prices Risk', desc: 'Volara AI analyzes volatility, market conditions, and prices fair options with probability estimates.', icon: '🧠' },
              { step: 3, title: 'Auto Settlement', desc: 'Options settle automatically on Sui at expiry. Claim your payout in seconds with no intermediaries.', icon: '⚡' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl mx-auto mb-6 hover:shadow-glow-indigo transition-all">
                  {item.icon}
                </div>
                <div className="font-mono text-primary text-xs mb-2">STEP {item.step}</div>
                <h3 className="font-syne font-bold text-xl text-white mb-3">{item.title}</h3>
                <p className="text-text-secondary font-mono text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Volara */}
      <section className="py-20 max-w-[1440px] mx-auto px-4 md:px-8">
        <h2 className="font-syne font-bold text-4xl text-white mb-12">Why Volara?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[
            { icon: <Brain className="text-primary" size={24} />, title: 'AI Powered Pricing', desc: 'Volara AI-generated fair value estimates and probability analysis on every trade. Know your risk before you trade.' },
            { icon: <Zap className="text-profit" size={24} />, title: 'Instant Settlement', desc: "Sui's sub-second finality means options settle the moment they expire. No waiting, no custodians." },
            { icon: <TrendingUp className="text-primary" size={24} />, title: 'Deep Liquidity', desc: 'Competitive premiums from deep liquidity pools and professional market makers incentivized by protocol fees.' },
          ].map((feature) => (
            <div key={feature.title} className="card p-6 hover-lift hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-card border border-white/10 flex items-center justify-center mb-5">
                {feature.icon}
              </div>
              <h3 className="font-syne font-bold text-xl text-white mb-3">{feature.title}</h3>
              <p className="text-text-secondary font-mono text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Showcase */}
      <section className="py-20 bg-card/20 border-y border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
              <Brain size={12} /> Powered by Volara AI
            </div>
            <h2 className="font-syne font-bold text-4xl text-white mb-6">AI That Trades With You</h2>
            <p className="text-text-secondary font-mono text-sm leading-relaxed mb-8">
              Get real-time insights, risk analysis, and market explanations from Volara AI. Every trade comes with probability estimates, breakeven calculations, and plain-English explanations.
            </p>
            <Link href="/trade">
              <button className="px-6 py-3 rounded-xl bg-primary/15 border border-primary/30 text-primary font-mono text-sm hover:bg-primary/25 transition-all">
                Explore AI Insights →
              </button>
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { text: 'This PUT has a 62% chance of expiring ITM.', detail: 'Based on current IV of 68% and 13 days to expiry.' },
              { text: 'Breakeven for this CALL is $0.76.', detail: 'Current price $0.737 + $0.023 premium paid.' },
              { text: 'Risk level: Medium. IV elevated ahead of settlement Friday.', detail: 'Historical vol suggests pullback likely.' },
            ].map((item, i) => (
              <div key={i} className="ai-box p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">💡</span>
                  <div>
                    <div className="text-white font-mono text-sm mb-1">{item.text}</div>
                    <div className="text-text-secondary font-mono text-xs">{item.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="card p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-profit/5" />
          <div className="relative z-10">
            <h2 className="font-syne font-extrabold text-5xl text-white mb-4">Ready to trade smarter?</h2>
            <p className="text-text-secondary font-mono mb-10">Join thousands of traders hedging and speculating with Volara.</p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/trade">
                <button className="px-10 py-4 rounded-xl bg-primary text-white font-mono font-medium hover:shadow-glow-indigo transition-all text-lg">
                  Start Trading
                </button>
              </Link>
              <Link href="/liquidity">
                <button className="px-10 py-4 rounded-xl border border-white/15 text-white font-mono hover:border-primary/40 transition-all text-lg">
                  Provide Liquidity
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-card/20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={20} className="text-primary" />
                <span className="font-syne font-bold text-xl">Volara</span>
              </div>
              <p className="text-text-secondary font-mono text-sm mb-4">Hedge smarter. Trade better.</p>
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
                <div className="font-syne font-semibold text-white mb-4 text-sm">{col.title}</div>
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
          <div className="border-t border-white/5 pt-6 flex items-center justify-between">
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



