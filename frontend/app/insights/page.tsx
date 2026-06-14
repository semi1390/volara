'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain } from 'lucide-react'
import { MARKETS, generateStrikes } from '@/lib/dummy-data'
import { getOptionAdvisorInsight } from '@/lib/claude'
import { cn } from '@/lib/utils'
import { usePrices } from '@/hooks/usePrices'

export default function InsightsPage() {
  const { prices } = usePrices()
  const [headerVisible, setHeaderVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setHeaderVisible(true), 100)
    setTimeout(() => setFormVisible(true), 200)
  }, [])

  const marketsWithPrices = MARKETS.map(m => {
    const livePrice = m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price
    const price = livePrice > 0 ? livePrice : m.price
    return { ...m, price, strikes: generateStrikes(price, 6) }
  })

  const [selectedMarketId, setSelectedMarketId] = useState(MARKETS[0].id)
  const selectedMarket = marketsWithPrices.find(m => m.id === selectedMarketId) || marketsWithPrices[0]
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL')
  const [strike, setStrike] = useState(selectedMarket.strikes[0])
  const [expiry, setExpiry] = useState(13)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [streamedText, setStreamedText] = useState('')
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    setStrike(selectedMarket.strikes[0])
  }, [selectedMarketId, selectedMarket.strikes[0]])

  const analyze = async () => {
    setLoading(true)
    setResult(null)
    setStreamedText('')
    setShowResult(false)

    const insight = await getOptionAdvisorInsight({
      type: optionType,
      strike,
      currentPrice: selectedMarket.price,
      expiryDays: expiry,
      impliedVol: selectedMarket.impliedVol / 100,
    })

    setResult(insight)
    setLoading(false)

    // Stream the insight text character by character
    if (insight?.insight) {
      setShowResult(true)
      let i = 0
      const text = insight.insight
      const interval = setInterval(() => {
        i++
        setStreamedText(text.slice(0, i))
        if (i >= text.length) clearInterval(interval)
      }, 18)
    }
  }

  return (
    <div className="pt-24 pb-12 min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 md:px-8">

        {/* Header */}
        <div className={cn(
          'transition-all duration-700',
          headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Brain size={28} className="text-primary flex-shrink-0" />
            <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-white">AI Insights</h1>
            <span className="px-2 py-1 rounded-full bg-primary text-white text-xs font-mono font-bold animate-pulse">VOLARA</span>
          </div>
          <p className="text-text-secondary font-mono text-sm md:text-base mb-4">
            Get AI-powered options analysis from Volara AI. Enter your trade parameters below.
          </p>
          <p className="flex items-center gap-2 text-yellow-400/70 font-mono text-xs mb-8 md:mb-10 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-2.5">
            <span>⚠️</span>
            AI insights are informational only and not investment advice. Always do your own research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

          {/* Input Form */}
          <div className={cn(
            'card p-5 md:p-6 space-y-5 transition-all duration-700 hover:border-primary/20',
            formVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
          )}>
            <h2 className="font-syne font-bold text-xl text-white">Trade Parameters</h2>

            {/* Market */}
            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Market</label>
              <select value={selectedMarket.id} onChange={e => setSelectedMarketId(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 font-mono text-white appearance-none focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
                {marketsWithPrices.map(m => (
                  <option key={m.id} value={m.id}>{m.name} (${m.price.toFixed(3)})</option>
                ))}
              </select>
            </div>

            {/* CALL/PUT */}
            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Option Type</label>
              <div className="flex gap-2">
                {(['CALL', 'PUT'] as const).map(t => (
                  <button key={t} onClick={() => setOptionType(t)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-sm font-mono font-bold transition-all min-h-[44px]',
                      optionType === t
                        ? t === 'CALL'
                          ? 'border-profit bg-profit/15 text-profit shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'border-danger bg-danger/15 text-danger shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'border-white/10 text-text-secondary hover:border-white/30 hover:text-white'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Strike */}
            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Strike Price: ${strike.toFixed(2)}</label>
              <div className="flex flex-wrap gap-2">
                {selectedMarket.strikes.map(s => (
                  <button key={s} onClick={() => setStrike(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all min-h-[36px]',
                      strike === s
                        ? 'border-primary bg-primary/15 text-primary shadow-glow-indigo'
                        : 'border-white/10 text-text-secondary hover:border-primary/30 hover:text-white'
                    )}>
                    ${s.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">
                Days to Expiry: <span className="text-primary font-bold">{expiry}</span>
              </label>
              <input type="range" min="1" max="30" value={expiry}
                onChange={e => setExpiry(parseInt(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs font-mono text-text-secondary mt-1">
                <span>1 day</span><span>30 days</span>
              </div>
            </div>

            {/* Analyze button */}
            <button onClick={analyze} disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-syne font-bold text-lg hover:shadow-glow-indigo hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 min-h-[52px]">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing with Volara AI...
                </>
              ) : (
                <>
                  <Brain size={20} />
                  Analyze This Trade
                </>
              )}
            </button>
          </div>

          {/* Result */}
          <div className={cn(
            'transition-all duration-700 delay-100',
            formVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
          )}>
            {result && showResult ? (
              <div className="ai-box p-5 md:p-6 space-y-5 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-primary" />
                  <span className="text-primary font-mono text-sm font-bold">Volara AI Analysis</span>
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-profit/15 text-profit font-mono text-xs">
                    {streamedText.length >= result.insight.length ? 'Complete' : 'Analyzing...'}
                  </div>
                </div>

                {/* Streamed text */}
                <p className="text-white font-mono text-sm leading-relaxed min-h-[60px]">
                  {streamedText}
                  {streamedText.length < result.insight.length && (
                    <span className="text-primary animate-pulse">|</span>
                  )}
                </p>

                {/* Stats — only show when streaming is done */}
                {streamedText.length >= result.insight.length && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background/50 rounded-xl p-3 md:p-4 text-center border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="text-text-secondary text-xs font-mono mb-2">Profit Probability</div>
                        <div className="font-mono font-bold text-3xl md:text-4xl text-white">
                          {result.profit_probability}<span className="text-lg text-text-secondary">%</span>
                        </div>
                        <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-danger via-yellow-400 to-profit rounded-full transition-all duration-1000"
                            style={{ width: `${result.profit_probability}%` }} />
                        </div>
                      </div>
                      <div className="bg-background/50 rounded-xl p-3 md:p-4 text-center border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="text-text-secondary text-xs font-mono mb-2">Breakeven Price</div>
                        <div className="font-mono font-bold text-3xl md:text-4xl text-white">${result.breakeven}</div>
                        <div className="text-xs font-mono text-text-secondary mt-2">
                          {result.breakeven > selectedMarket.price ? 'Above current' : 'Below current'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background/50 rounded-xl p-3 md:p-4 border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="text-text-secondary text-xs font-mono mb-2">Risk Level</div>
                        <div className={cn('font-mono font-bold text-xl',
                          result.risk_level === 'Low' ? 'text-profit' : result.risk_level === 'High' ? 'text-danger' : 'text-yellow-400'
                        )}>{result.risk_level}</div>
                      </div>
                      <div className="bg-background/50 rounded-xl p-3 md:p-4 border border-white/5 hover:border-primary/20 transition-colors">
                        <div className="text-text-secondary text-xs font-mono mb-2">AI Confidence</div>
                        <div className="font-mono font-bold text-xl text-white">{result.confidence}%</div>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-profit rounded-full transition-all duration-1000"
                            style={{ width: `${result.confidence}%` }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : loading ? (
              <div className="ai-box p-5 md:p-6 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] text-center">
                <div className="relative mb-6">
                  <Brain size={48} className="text-primary animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                <p className="text-primary font-mono text-sm mb-2">Volara AI is analyzing your trade...</p>
                <p className="text-text-secondary font-mono text-xs">Checking IV, pool state, and market conditions</p>
              </div>
            ) : (
              <div className="ai-box p-5 md:p-6 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] text-center">
                <Brain size={48} className="text-primary/30 mb-4" />
                <p className="text-text-secondary font-mono text-sm">Configure your trade parameters and click Analyze to get Volara AI's assessment.</p>
                <div className="mt-6 grid grid-cols-3 gap-3 w-full">
                  {[
                    { label: 'Probability', icon: '📊' },
                    { label: 'Breakeven', icon: '⚖️' },
                    { label: 'Risk Level', icon: '🎯' },
                  ].map(item => (
                    <div key={item.label} className="bg-background/50 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-text-secondary font-mono text-xs">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}