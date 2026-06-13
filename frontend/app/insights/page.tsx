'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, TrendingUp } from 'lucide-react'
 import { MARKETS, generateStrikes } from '@/lib/dummy-data'
import { getOptionAdvisorInsight } from '@/lib/claude'
import { cn } from '@/lib/utils'
import { usePrices } from '@/hooks/usePrices'

export default function InsightsPage() {
  const { prices } = usePrices()
 

const marketsWithPrices = MARKETS.map(m => {
  const livePrice = m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price
  const price = livePrice > 0 ? livePrice : m.price
  return { ...m, price, strikes: generateStrikes(price, 6) }
})
  const [selectedMarketId, setSelectedMarketId] = useState(MARKETS[0].id)
  const selectedMarket = marketsWithPrices.find(m => m.id === selectedMarketId) || marketsWithPrices[0]
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL')
const [strike, setStrike] = useState(selectedMarket.strikes[0])

useEffect(() => {
  setStrike(selectedMarket.strikes[0])
}, [selectedMarketId, selectedMarket.strikes[0]])
  const [expiry, setExpiry] = useState(13)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const analyze = async () => {
    setLoading(true)
    const insight = await getOptionAdvisorInsight({
      type: optionType,
      strike,
      currentPrice: selectedMarket.price,
      expiryDays: expiry,
      impliedVol: selectedMarket.impliedVol / 100,
    })
    setResult(insight)
    setLoading(false)
  }

  return (
    <div className="pt-20 md:pt-24 pb-12 min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 md:px-8">

        {/* Header: flex-wrap so badge doesn't clip off-screen */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Brain size={28} className="text-primary flex-shrink-0" />
          {/* text-4xl on mobile → text-5xl on md+ */}
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-white">AI Insights</h1>
          <span className="px-2 py-1 rounded-full bg-primary text-white text-xs font-mono font-bold flex-shrink-0">VOLARA</span>
        </div>
       <p className="text-text-secondary font-mono text-sm md:text-base mb-4">
  Get AI-powered options analysis from Volara AI. Enter your trade parameters below.
</p>
<p className="flex items-center gap-2 text-yellow-400/70 font-mono text-xs mb-8 md:mb-10 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-2.5">
  <span>⚠️</span>
  AI insights are informational only and not investment advice. Always do your own research.
</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Input Form */}
          <div className="card p-5 md:p-6 space-y-5">
            <h2 className="font-syne font-bold text-xl text-white">Trade Parameters</h2>

            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Market</label>
              <select
                value={selectedMarket.id}
                onChange={e => setSelectedMarketId(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 font-mono text-white appearance-none focus:outline-none focus:border-primary/40"
              >
                {marketsWithPrices.map(m => <option key={m.id} value={m.id}>{m.name} (${m.price.toFixed(3)})</option>)}
              </select>
            </div>

            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Option Type</label>
              <div className="flex gap-2">
                {(['CALL', 'PUT'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setOptionType(t)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl border text-sm font-mono font-bold transition-all min-h-[44px]',
                      optionType === t
                        ? t === 'CALL' ? 'border-profit bg-profit/15 text-profit' : 'border-danger bg-danger/15 text-danger'
                        : 'border-white/10 text-text-secondary hover:border-white/30'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Strike Price: ${strike.toFixed(2)}</label>
              <div className="flex flex-wrap gap-2">
                {selectedMarket.strikes.map(s => (
                  <button
                    key={s}
                    onClick={() => setStrike(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all min-h-[36px]',
                      strike === s ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-secondary hover:border-white/30'
                    )}
                  >
                    ${s.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-text-secondary text-xs font-mono block mb-2">Days to Expiry: {expiry}</label>
              <input
                type="range" min="1" max="30" value={expiry}
                onChange={e => setExpiry(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs font-mono text-text-secondary mt-1">
                <span>1 day</span><span>30 days</span>
              </div>
            </div>

            <button
              onClick={analyze}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-white font-syne font-bold text-lg hover:shadow-glow-indigo transition-all disabled:opacity-50 flex items-center justify-center gap-3 min-h-[52px]"
            >
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
          <div>
            {result ? (
              <div className="ai-box p-5 md:p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-primary" />
                  <span className="text-primary font-mono text-sm font-bold">Volara AI Analysis</span>
                </div>

                <p className="text-white font-mono text-sm leading-relaxed">{result.insight}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-xl p-3 md:p-4 text-center">
                    <div className="text-text-secondary text-xs font-mono mb-2">Profit Probability</div>
                    <div className="font-mono font-bold text-3xl md:text-4xl text-white">
                      {result.profit_probability}<span className="text-lg text-text-secondary">%</span>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-danger via-yellow-400 to-profit rounded-full transition-all" style={{ width: `${result.profit_probability}%` }} />
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-xl p-3 md:p-4 text-center">
                    <div className="text-text-secondary text-xs font-mono mb-2">Breakeven Price</div>
                    <div className="font-mono font-bold text-3xl md:text-4xl text-white">${result.breakeven}</div>
                    <div className="text-xs font-mono text-text-secondary mt-2">
                      {result.breakeven > selectedMarket.price ? 'Above current' : 'Below current'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 rounded-xl p-3 md:p-4">
                    <div className="text-text-secondary text-xs font-mono mb-2">Risk Level</div>
                    <div className={cn('font-mono font-bold text-xl', result.risk_level === 'Low' ? 'text-profit' : result.risk_level === 'High' ? 'text-danger' : 'text-yellow-400')}>
                      {result.risk_level}
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3 md:p-4">
                    <div className="text-text-secondary text-xs font-mono mb-2">AI Confidence</div>
                    <div className="font-mono font-bold text-xl text-white">{result.confidence}%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ai-box p-5 md:p-6 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] text-center">
                <Brain size={48} className="text-primary/30 mb-4" />
                <p className="text-text-secondary font-mono text-sm">Configure your trade parameters and click Analyze to get Volara AI's assessment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}