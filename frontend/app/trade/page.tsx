'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Plus, Minus, ChevronRight, BookOpen } from 'lucide-react'
import { cn, calculatePremium } from '@/lib/utils'
import { RECENT_TRADES, EXPIRED_POSITIONS, MARKETS, EXPIRIES } from '@/lib/dummy-data'
import { getOptionAdvisorInsight } from '@/lib/claude'
import { usePrices } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { useOrderBook } from '@/hooks/useOrderBook'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import toast from 'react-hot-toast'

type OptionType = 'CALL' | 'PUT'

function OrderBookRow({ entry, side, maxTotal }: { entry: { price: number; size: number; total: number }; side: 'ask' | 'bid'; maxTotal: number }) {
  const pct = Math.min((entry.total / maxTotal) * 100, 100)
  return (
    <div className={cn('relative grid grid-cols-3 gap-1 px-2 py-0.5 text-xs font-mono cursor-pointer', side === 'ask' ? 'hover:bg-danger/5' : 'hover:bg-profit/5')}>
      <div className={cn('absolute inset-y-0 right-0 opacity-15', side === 'ask' ? 'bg-danger' : 'bg-profit')} style={{ width: `${pct}%` }} />
      <span className={cn('relative z-10', side === 'ask' ? 'text-danger' : 'text-profit')}>{entry.price.toFixed(4)}</span>
      <span className="relative z-10 text-right text-text-secondary">{entry.size.toLocaleString()}</span>
      <span className="relative z-10 text-right text-text-secondary">{entry.total.toLocaleString()}</span>
    </div>
  )
}

function TradingChart({ market }: { market: typeof MARKETS[0] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    const symbol = market.id === 'sui-usdc' ? 'BINANCE:SUIUSDT' : market.id === 'deep-usdc' ? 'CRYPTO:DEEPUSDT' : 'BINANCE:CETUSUSDT'
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval: '60', timezone: 'Etc/UTC',
      theme: 'dark', style: '1', locale: 'en',
      backgroundColor: 'rgba(15,15,26,0)',
      gridColor: 'rgba(255,255,255,0.04)',
      hide_top_toolbar: false, hide_legend: false,
      save_image: false, calendar: false, hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'
    containerRef.current.appendChild(widgetDiv)
    containerRef.current.appendChild(script)
  }, [market.id])
  return <div ref={containerRef} className="tradingview-widget-container w-full h-full" />
}

function AIAdvisorBox({ type, strike, market, expiryDays }: { type: OptionType; strike: number; market: typeof MARKETS[0]; expiryDays: number }) {
  const [insight, setInsight] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    getOptionAdvisorInsight({ type, strike, currentPrice: market.price, expiryDays, impliedVol: market.impliedVol / 100 })
      .then(data => { setInsight(data); setLoading(false) })
  }, [type, strike, market.price, expiryDays])

  if (loading) return (
    <div className="ai-box p-3 flex items-center gap-2 text-primary text-xs font-mono">
      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      Analyzing with Volara AI...
    </div>
  )
  if (!insight) return null
  const riskColor = insight.risk_level === 'Low' || insight.risk_level === 'LOW' ? 'text-profit' : insight.risk_level === 'High' || insight.risk_level === 'HIGH' ? 'text-danger' : 'text-yellow-400'

  return (
    <div className="ai-box p-3">
      <div className="flex items-center gap-2 mb-2">
        <span>💡</span>
        <span className="text-primary font-mono text-xs font-bold">Volara AI</span>
        <span className="ml-auto text-text-secondary text-xs font-mono">{insight.confidence}% conf.</span>
      </div>
      <p className="text-white font-mono text-xs mb-2 leading-relaxed">{insight.insight}</p>
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div><div className="text-text-secondary mb-0.5">Prob.</div><div className="text-white font-bold">{insight.profit_probability}%</div></div>
        <div><div className="text-text-secondary mb-0.5">Break.</div><div className="text-white font-bold">${insight.breakeven}</div></div>
        <div><div className="text-text-secondary mb-0.5">Risk</div><div className={cn('font-bold', riskColor)}>{insight.risk_level}</div></div>
      </div>
      <button onClick={() => setExpanded(!expanded)} className="mt-2 text-primary text-xs font-mono hover:underline flex items-center gap-1">
        {expanded ? 'Hide' : 'Why?'} <ChevronRight size={10} className={cn('transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 text-text-secondary text-xs font-mono leading-relaxed">
          IV: {market.impliedVol}% · {expiryDays}d to expiry · {strike > market.price ? 'OTM' : 'ITM'}
        </div>
      )}
    </div>
  )
}

export default function TradePage() {
  const { prices } = usePrices()
  const account = useCurrentAccount()
  const { positions, isLoading: positionsLoading, refetch: refetchPositions } = usePositions()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  // ── NEW: mobile order book toggle ──────────────────────────────────────────
  const [showOrderBook, setShowOrderBook] = useState(false)

  const { data: balanceData } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '' },
    { enabled: !!account?.address }
  )
  const suiBalance = balanceData
    ? (parseInt(balanceData.totalBalance) / 1_000_000_000).toFixed(3)
    : '0.000'

  const marketsWithPrices = MARKETS.map(m => ({
    ...m,
    price: m.id === 'sui-usdc' ? prices.sui.price : m.id === 'deep-usdc' ? prices.deep.price : prices.cetus.price,
  }))

  const [selectedMarketId, setSelectedMarketId] = useState(MARKETS[0].id)
  const selectedMarket = marketsWithPrices.find(m => m.id === selectedMarketId) || marketsWithPrices[0]
  const { orderBook, loading: orderBookLoading } = useOrderBook(selectedMarketId)
  const [activeTab, setActiveTab] = useState<'CALLS' | 'PUTS'>('CALLS')
  const [optionType, setOptionType] = useState<OptionType>('CALL')
  const [selectedStrike, setSelectedStrike] = useState(MARKETS[0].strikes[0])
  const [selectedExpiry, setSelectedExpiry] = useState(EXPIRIES[1])
  const [quantity, setQuantity] = useState(1)
  const [showExpired, setShowExpired] = useState(false)
  const [centerTab, setCenterTab] = useState<'trade' | 'chain'>('trade')

  const premium = calculatePremium(optionType, selectedStrike, selectedMarket.price, selectedExpiry.daysLeft, selectedMarket.impliedVol / 100)
  const totalPremium = +(premium * quantity).toFixed(4)
  const maxAskTotal = Math.max(...orderBook.asks.map(a => a.total))
  const maxBidTotal = Math.max(...orderBook.bids.map(b => b.total))

  const handleBuy = () => {
    if (!account) { toast.error('Connect your wallet first!'); return }
    const tx = new Transaction()
    const premiumMist = Math.floor(totalPremium * 1_000_000_000)
    const strikeMist = Math.floor(selectedStrike * 1_000_000_000)
    const expiryTs = Math.floor(new Date(selectedExpiry.date).getTime() / 1000)
    const [coin] = tx.splitCoins(tx.gas, [premiumMist])
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::options::buy_option`,
      arguments: [
        tx.object(process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID!),
        tx.pure.u8(optionType === 'CALL' ? 0 : 1),
        tx.pure.u64(strikeMist),
        tx.pure.u64(expiryTs),
        tx.pure.u64(quantity),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(selectedMarket.name))),
        coin,
      ],
    })
    toast.loading('Buying option on Sui...')
    signAndExecute({ transaction: tx as any }, {
      onSuccess: (result) => {
        toast.dismiss()
        toast.success(`Option bought! 🎉 Tx: ${result.digest.slice(0, 8)}...`, { duration: 6000 })
        refetchPositions()
      },
      onError: (e) => {
        toast.dismiss()
        const msg = e.message || ''
        if (msg.includes('EInsufficientBalance') || msg.includes('pool')) {
          toast.error('❌ Pool has insufficient liquidity.')
        } else if (msg.includes('reject') || msg.includes('cancel') || msg.includes('denied')) {
          toast.error('Transaction rejected by wallet.')
        } else if (msg.includes('EInsufficientPremium')) {
          toast.error('❌ Premium too low. Increase quantity.')
        } else {
          toast.error(`Transaction failed: ${msg.slice(0, 80)}`)
        }
      },
    })
  }

  return (
    /*
     * MOBILE LAYOUT CHANGES:
     * - Removed h-screen + overflow-hidden on mobile (causes squished 3-col)
     * - On mobile: single column, scrollable
     * - On lg+: restore original h-screen 3-col fixed layout
     */
    <div className="pt-16 bg-background lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
      <div className="lg:flex-1 lg:grid lg:grid-cols-[260px_1fr_300px] lg:overflow-hidden flex flex-col">

        {/* ── MOBILE ORDER BOOK TOGGLE BUTTON ─────────────────────────────── */}
        {/* Only visible on mobile, sits above the chart */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-white/5 bg-card/20">
          <div className="relative">
            <select
              value={selectedMarketId}
              onChange={e => setSelectedMarketId(e.target.value)}
              className="bg-background border border-white/10 rounded-xl px-3 py-1.5 font-syne font-semibold text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary/40 pr-7"
            >
              {MARKETS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
          <button
            onClick={() => setShowOrderBook(!showOrderBook)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all min-h-[36px]',
              showOrderBook
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-white/10 text-text-secondary hover:text-white'
            )}
          >
            <BookOpen size={12} />
            Order Book
          </button>
        </div>

        {/* LEFT — Order Book */}
        {/*
         * MOBILE: hidden by default, shown when showOrderBook=true via slide-down
         * DESKTOP (lg+): always visible as left panel
         */}
        <div className={cn(
          'border-white/5 flex flex-col overflow-hidden bg-card/20',
          'lg:border-r',                          // border only on desktop
          showOrderBook ? 'flex' : 'hidden',       // mobile toggle
          'lg:flex'                                 // always show on desktop
        )}>
          {/* Desktop-only market selector (hidden on mobile — we have one above) */}
          <div className="p-3 border-b border-white/5">
            <div className="relative mb-3 hidden lg:block">
              <select
                value={selectedMarketId}
                onChange={e => setSelectedMarketId(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 font-syne font-semibold text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary/40"
              >
                {MARKETS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>

            {/* Mobile: close button for order book */}
            <div className="flex items-center justify-between mb-3 lg:hidden">
              <span className="text-xs font-mono text-text-secondary">ORDER BOOK</span>
              <button
                onClick={() => setShowOrderBook(false)}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10"
              >
                <X size={12} />
              </button>
            </div>

            <div className="flex gap-1">
              {(['CALLS', 'PUTS'] as const).map(tab => (
                <button key={tab}
                  onClick={() => { setActiveTab(tab); setOptionType(tab === 'CALLS' ? 'CALL' : 'PUT') }}
                  className={cn('flex-1 py-1.5 rounded-lg text-xs font-mono transition-all min-h-[36px]',
                    activeTab === tab
                      ? tab === 'CALLS' ? 'bg-profit/15 text-profit border border-profit/30' : 'bg-danger/15 text-danger border border-danger/30'
                      : 'text-text-secondary hover:text-white bg-white/5'
                  )}>{tab}</button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '55%' }}>
            <div className="grid grid-cols-3 gap-1 px-2 py-1.5 text-xs font-mono text-text-secondary border-b border-white/5">
              <span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
            </div>
            <div className="flex flex-col-reverse">
              {orderBookLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-3 gap-1 px-2 py-0.5 animate-pulse">
                    <div className="h-3 bg-danger/20 rounded" />
                    <div className="h-3 bg-white/10 rounded ml-auto w-12" />
                    <div className="h-3 bg-white/10 rounded ml-auto w-12" />
                  </div>
                ))
              ) : (
                orderBook.asks.map((ask, i) => <OrderBookRow key={i} entry={ask} side="ask" maxTotal={maxAskTotal} />)
              )}
            </div>
            <div className="px-2 py-1.5 bg-primary/10 border-y border-primary/20 mark-price-pulse flex items-center justify-between">
              <span className="text-primary font-mono text-sm font-bold">{orderBook.markPrice.toFixed(4)}</span>
              <span className="text-text-secondary text-xs font-mono">MARK</span>
            </div>
            {orderBookLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-1 px-2 py-0.5 animate-pulse">
                  <div className="h-3 bg-profit/20 rounded" />
                  <div className="h-3 bg-white/10 rounded ml-auto w-12" />
                  <div className="h-3 bg-white/10 rounded ml-auto w-12" />
                </div>
              ))
            ) : (
              orderBook.bids.map((bid, i) => <OrderBookRow key={i} entry={bid} side="bid" maxTotal={maxBidTotal} />)
            )}
          </div>

          <div className="border-t border-white/5">
            <div className="px-2 py-1.5 text-xs font-mono text-text-secondary border-b border-white/5 flex items-center justify-between">
              <span>RECENT TRADES</span>
              <span className="text-primary text-xs">LIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-1 px-2 py-1 text-xs font-mono text-text-secondary">
              <span>Price</span><span className="text-right">Size</span><span className="text-right">Time</span>
            </div>
            {RECENT_TRADES.slice(0, 6).map((trade, i) => (
              <div key={i} className="grid grid-cols-3 gap-1 px-2 py-0.5 text-xs font-mono">
                <span className={trade.side === 'buy' ? 'text-profit' : 'text-danger'}>
                  {orderBook.markPrice > 0 ? orderBook.markPrice.toFixed(4) : trade.price.toFixed(4)}
                </span>
                <span className="text-right text-text-secondary">{trade.size.toLocaleString()}</span>
                <span className="text-right text-text-secondary">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — Chart + Tabs */}
        {/*
         * MOBILE: full width, natural height (not fixed)
         * DESKTOP: flex column with fixed h-screen inherited from parent
         */}
        <div className="border-white/5 flex flex-col lg:border-r lg:overflow-hidden">
          {/* Chart */}
          {/*
           * MOBILE: 260px tall (reasonable on 375px width)
           * DESKTOP: 320px fixed as before
           */}
          <div className="border-b border-white/5 flex-shrink-0 h-[260px] lg:h-[320px]">
            <TradingChart market={selectedMarket} />
          </div>

          {/* Market info bar */}
          {/*
           * MOBILE: horizontal scroll so all 4 stats visible without wrapping
           */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-4 lg:gap-6 bg-card/20 flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-text-secondary text-xs font-mono">Last</span>
              <span className="text-white font-mono text-sm font-bold">${selectedMarket.price.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-text-secondary text-xs font-mono">IV</span>
              <span className="text-primary font-mono text-sm">{selectedMarket.impliedVol}%</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-text-secondary text-xs font-mono">Vol</span>
              <span className="text-white font-mono text-sm">${(selectedMarket.volume24h / 1_000_000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-text-secondary text-xs font-mono">OI</span>
              <span className="text-white font-mono text-sm">${(selectedMarket.openInterest / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 bg-card/10 flex-shrink-0">
            <button
              onClick={() => setCenterTab('trade')}
              className={cn('px-4 py-2.5 text-xs font-mono transition-all min-h-[44px]',
                centerTab === 'trade' ? 'text-white border-b-2 border-primary' : 'text-text-secondary hover:text-white'
              )}
            >Trade</button>
            <button
              onClick={() => setCenterTab('chain')}
              className={cn('px-4 py-2.5 text-xs font-mono transition-all min-h-[44px]',
                centerTab === 'chain' ? 'text-white border-b-2 border-primary' : 'text-text-secondary hover:text-white'
              )}
            >Options Chain</button>
          </div>

          {/* Tab content */}
          {/*
           * MOBILE: natural height (no flex-1 overflow-y-auto which needs a fixed parent)
           * DESKTOP: flex-1 + overflow-y-auto as before
           */}
          <div className="lg:flex-1 lg:overflow-y-auto">
            {centerTab === 'trade' ? (
              <div className="p-4 flex flex-col gap-4">
                {/* CALL/PUT + Strike + Expiry */}
                {/*
                 * MOBILE: stack into rows instead of one cramped flex-wrap line
                 */}
                <div className="flex flex-col gap-3">
                  {/* Row 1: CALL/PUT toggle */}
                  <div className="flex rounded-xl border border-white/10 p-0.5 gap-0.5 w-fit">
                    {(['CALL', 'PUT'] as OptionType[]).map(type => (
                      <button key={type} onClick={() => setOptionType(type)}
                        className={cn('px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all min-h-[36px]',
                          optionType === type ? type === 'CALL' ? 'pill-active-call' : 'pill-active-put' : 'text-text-secondary hover:text-white'
                        )}>{type}</button>
                    ))}
                  </div>

                  {/* Row 2: Strike buttons — scrollable on mobile */}
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1.5">Strike</div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {selectedMarket.strikes.slice(0, 6).map(strike => (
                        <button key={strike} onClick={() => setSelectedStrike(strike)}
                          className={cn('px-2 py-1.5 rounded-lg text-xs font-mono border transition-all flex-shrink-0 min-h-[36px]',
                            selectedStrike === strike ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-secondary hover:border-white/30'
                          )}>{strike.toFixed(2)}</button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Expiry buttons */}
                  <div>
                    <div className="text-text-secondary text-xs font-mono mb-1.5">Expiry</div>
                    <div className="flex gap-1 flex-wrap">
                      {EXPIRIES.map(exp => (
                        <button key={exp.label} onClick={() => setSelectedExpiry(exp)}
                          className={cn('px-2 py-1.5 rounded-lg text-xs font-mono border transition-all min-h-[36px]',
                            selectedExpiry.label === exp.label ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-secondary hover:border-white/30'
                          )}>{exp.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quantity + Premium */}
                {/*
                 * MOBILE: stack quantity above premium stats
                 * DESKTOP: side by side as before
                 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 bg-card border border-white/10 rounded-xl px-3 py-2">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 min-h-[32px]"><Minus size={12} /></button>
                    <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-transparent text-center font-mono text-white text-sm focus:outline-none" />
                    <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/15 min-h-[32px]"><Plus size={12} /></button>
                  </div>
                  <div className="w-full sm:flex-1 grid grid-cols-3 gap-3 bg-card/50 border border-white/10 rounded-xl px-3 py-2">
                    <div><div className="text-text-secondary text-xs font-mono mb-0.5">Premium</div><div className="text-white font-bold text-sm font-mono">{totalPremium} SUI</div></div>
                    <div><div className="text-text-secondary text-xs font-mono mb-0.5">Max Loss</div><div className="text-danger font-bold text-sm font-mono">{totalPremium} SUI</div></div>
                    <div><div className="text-text-secondary text-xs font-mono mb-0.5">Max Profit</div><div className="text-profit font-bold text-sm font-mono">Unlimited</div></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Options Chain */
              <div className="p-4">
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    {EXPIRIES.map(exp => (
                      <button key={exp.label} onClick={() => setSelectedExpiry(exp)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-mono border transition-all min-h-[36px]',
                          selectedExpiry.label === exp.label ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-text-secondary hover:border-white/30'
                        )}>{exp.label}</button>
                    ))}
                  </div>
                  <span className="text-text-secondary text-xs font-mono sm:ml-auto">Spot: ${selectedMarket.price.toFixed(4)}</span>
                </div>

                {/* Options chain table — horizontal scroll on mobile */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-2 text-profit">Delta</th>
                        <th className="text-right py-2 px-2 text-profit">Bid</th>
                        <th className="text-right py-2 px-2 text-profit">Ask</th>
                        <th className="text-center py-2 px-3 text-white">Strike</th>
                        <th className="text-left py-2 px-2 text-danger">Bid</th>
                        <th className="text-left py-2 px-2 text-danger">Ask</th>
                        <th className="text-right py-2 px-2 text-danger">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMarket.strikes.map(strike => {
                        const isITMCall = selectedMarket.price > strike
                        const isITMPut = selectedMarket.price < strike
                        const callPremium = calculatePremium('CALL', strike, selectedMarket.price, selectedExpiry.daysLeft, selectedMarket.impliedVol / 100)
                        const putPremium = calculatePremium('PUT', strike, selectedMarket.price, selectedExpiry.daysLeft, selectedMarket.impliedVol / 100)
                        const callBid = +(callPremium * 0.95).toFixed(4)
                        const callAsk = +(callPremium * 1.05).toFixed(4)
                        const putBid = +(putPremium * 0.95).toFixed(4)
                        const putAsk = +(putPremium * 1.05).toFixed(4)
                        const callDelta = isITMCall ? 0.65 : 0.35
                        const putDelta = isITMPut ? 0.65 : 0.35
                        const isAtMoney = Math.abs(selectedMarket.price - strike) / selectedMarket.price < 0.02

                        return (
                          <tr key={strike}
                            className={cn('border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors',
                              isITMCall && 'bg-profit/3'
                            )}
                            onClick={() => { setSelectedStrike(strike); setCenterTab('trade') }}
                          >
                            <td className={cn('py-2 px-2', isITMCall ? 'text-profit font-bold' : 'text-text-secondary')}>{callDelta.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right text-profit">{callBid}</td>
                            <td className="py-2 px-2 text-right text-profit">{callAsk}</td>
                            <td className={cn('py-2 px-3 text-center font-bold',
                              isAtMoney ? 'text-primary bg-primary/10 rounded' : 'text-white'
                            )}>
                              ${strike.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-danger">{putBid}</td>
                            <td className="py-2 px-2 text-danger">{putAsk}</td>
                            <td className={cn('py-2 px-2 text-right', isITMPut ? 'text-danger font-bold' : 'text-text-secondary')}>{putDelta.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-xs font-mono text-text-secondary flex gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-profit/30 rounded inline-block" /> ITM</span>
                  <span>· Click row to select strike & trade</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — AI + Buy + Positions */}
        {/*
         * MOBILE: natural flow below the center column
         * DESKTOP: fixed right panel as before
         */}
        <div className="flex flex-col lg:overflow-hidden bg-card/10 border-t border-white/5 lg:border-t-0">
          <div className="p-3 border-b border-white/5 space-y-3">
            <AIAdvisorBox type={optionType} strike={selectedStrike} market={selectedMarket} expiryDays={selectedExpiry.daysLeft} />
            <button onClick={handleBuy}
              className={cn('w-full py-3 rounded-xl font-syne font-bold text-white text-sm transition-all min-h-[48px]',
                optionType === 'CALL' ? 'btn-call' : 'btn-put'
              )}>
              Buy {optionType} — {totalPremium} SUI
            </button>
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
              <span>Balance</span>
              <span className="text-white">{account ? `${suiBalance} SUI` : 'Not connected'}</span>
            </div>
          </div>

          <div className="px-3 py-2.5 border-b border-white/5 font-syne font-semibold text-sm text-white flex items-center justify-between">
            <span>MY POSITIONS</span>
            {positions.length > 0 && <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">{positions.length}</span>}
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto">
            <div className="px-3 py-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
              <span className="text-xs font-mono text-text-secondary">OPEN</span>
            </div>

            {positionsLoading ? (
              <div className="space-y-2 px-2">
                {[1, 2].map(i => (
                  <div key={i} className="bg-card border border-white/5 rounded-xl p-2.5 animate-pulse">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-5 bg-white/10 rounded" />
                        <div className="w-12 h-4 bg-white/10 rounded" />
                      </div>
                      <div className="w-5 h-5 bg-white/10 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j}>
                          <div className="w-10 h-3 bg-white/10 rounded mb-1" />
                          <div className="w-16 h-3 bg-white/5 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-text-secondary font-mono text-xs">No active positions.</div>
                <div className="text-text-secondary font-mono text-xs mt-1">Buy your first option!</div>
              </div>
            ) : (
              <div className="space-y-2 px-2">
                {positions.map(pos => (
                  <div key={pos.id} className="bg-card border border-white/5 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-xs font-mono font-bold px-1.5 py-0.5 rounded', pos.type === 'CALL' ? 'bg-profit/15 text-profit' : 'bg-danger/15 text-danger')}>{pos.type}</span>
                        <span className="text-text-secondary text-xs font-mono">${pos.strike.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!account) { toast.error('Connect wallet!'); return }
                          const tx = new Transaction()
                          tx.moveCall({ target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::options::close_position`, arguments: [tx.object(pos.id)] })
                          toast.loading('Closing...')
                          signAndExecute({ transaction: tx as any }, {
                            onSuccess: (result) => {
                              toast.dismiss()
                              toast.success(`Position closed! Tx: ${result.digest.slice(0, 8)}...`, { duration: 6000 })
                              refetchPositions()
                            },
                            onError: (e) => {
                              toast.dismiss()
                              const msg = e.message || ''
                              if (msg.includes('reject') || msg.includes('cancel')) {
                                toast.error('Transaction rejected.')
                              } else {
                                toast.error(`Failed: ${msg.slice(0, 60)}`)
                              }
                            },
                          })
                        }}
                        className="w-8 h-8 rounded bg-white/5 hover:bg-danger/20 hover:text-danger flex items-center justify-center transition-colors"
                      ><X size={10} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <div><div className="text-text-secondary">Expiry</div><div className="text-white">{new Date(pos.expiry * 1000).toLocaleDateString()}</div></div>
                      <div><div className="text-text-secondary">Qty</div><div className="text-white">{pos.quantity}</div></div>
                      <div><div className="text-text-secondary">Premium</div><div className="text-white">{pos.premium.toFixed(4)}</div></div>
                      <div><div className="text-text-secondary">Market</div><div className="text-white text-xs truncate">{pos.market}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 px-2 pb-4">
              <button onClick={() => setShowExpired(!showExpired)}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs font-mono text-text-secondary hover:text-white transition-colors min-h-[40px]">
                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                EXPIRED
                <ChevronRight size={10} className={cn('ml-auto transition-transform', showExpired && 'rotate-90')} />
              </button>
              {showExpired && (
                <div className="space-y-1.5 mt-1">
                  {EXPIRED_POSITIONS.map(pos => (
                    <div key={pos.id} className="bg-card/50 border border-white/5 rounded-xl p-2 opacity-60">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn('text-xs font-mono', pos.type === 'CALL' ? 'text-profit' : 'text-danger')}>{pos.type}</span>
                        <span className="text-text-secondary text-xs font-mono">${pos.strike.toFixed(2)} · {pos.expiry}</span>
                      </div>
                      <div className={cn('text-xs font-mono font-bold', pos.pnl >= 0 ? 'text-profit' : 'text-danger')}>
                        {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)} USDC
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 p-3">
            <div className="text-xs font-mono text-text-secondary mb-2">P&L SUMMARY</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <div className="text-text-secondary mb-0.5">Premiums Paid</div>
                <div className="text-white font-bold">{positions.reduce((s, p) => s + p.premium, 0).toFixed(4)} SUI</div>
              </div>
              <div>
                <div className="text-text-secondary mb-0.5">Positions</div>
                <div className="text-primary font-bold">{positions.length} active</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}