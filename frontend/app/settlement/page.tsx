'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { EXPIRING_POSITIONS, SETTLEMENT_HISTORY } from '@/lib/dummy-data'
import { getTimeUntilExpiry, cn } from '@/lib/utils'
import { useCurrentAccount } from '@mysten/dapp-kit'
import toast from 'react-hot-toast'
import { ConnectButton } from '@mysten/dapp-kit'

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(getTimeUntilExpiry(targetDate))
  }, [targetDate])

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilExpiry(targetDate))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  const totalSeconds = time.days * 86400 + time.hours * 3600 + time.minutes * 60 + time.seconds
  const isUrgent = totalSeconds < 3600
  const pad = (n: number) => n.toString().padStart(2, '0')
  const units = [
    { label: 'DAYS', value: pad(time.days) },
    { label: 'HOURS', value: pad(time.hours) },
    { label: 'MINUTES', value: pad(time.minutes) },
    { label: 'SECONDS', value: pad(time.seconds) },
  ]

  if (!mounted) return (
    <div className="text-center py-8 md:py-12">
      <div className="text-text-secondary font-mono text-sm mb-4 md:mb-6">Next Settlement In</div>
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {['DAYS', 'HOURS', 'MINUTES', 'SECONDS'].map((label, i) => (
          <div key={label} className="flex items-center gap-2 md:gap-4">
            <div className="text-center">
              <div className="font-mono font-bold text-5xl md:text-8xl leading-none tabular-nums text-white">00</div>
              <div className="text-text-secondary font-mono text-[10px] md:text-xs mt-1 md:mt-2 tracking-widest">{label}</div>
            </div>
            {i < 3 && <div className="text-3xl md:text-6xl font-mono leading-none mb-3 md:mb-4 text-white/30">:</div>}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="text-center py-8 md:py-12">
      <div className="text-text-secondary font-mono text-sm mb-4 md:mb-6">Next Settlement In</div>
      <div className={cn('flex items-center justify-center gap-2 md:gap-4', isUrgent && 'countdown-glow')}>
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-center gap-2 md:gap-4">
            <div className="text-center">
              <div className={cn('font-mono font-bold text-5xl md:text-8xl leading-none tabular-nums', isUrgent ? 'text-danger' : 'text-white')}>
                {unit.value}
              </div>
              <div className="text-text-secondary font-mono text-[10px] md:text-xs mt-1 md:mt-2 tracking-widest">{unit.label}</div>
            </div>
            {i < 3 && (
              <div className={cn('text-3xl md:text-6xl font-mono leading-none mb-3 md:mb-4', isUrgent ? 'text-danger animate-pulse' : 'text-white/30')}>:</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 md:mt-6 text-text-secondary font-mono text-xs md:text-sm px-4">
        Settlement Date: <span className="text-white">{targetDate.toUTCString()}</span>
      </div>
    </div>
  )
}

export default function SettlementPage() {
  const [settlementPrice, setSettlementPrice] = useState(0.74)
  const account = useCurrentAccount()

  const getNextFriday = () => {
    const now = new Date()
    const day = now.getUTCDay()
    const daysUntilFriday = (5 - day + 7) % 7 || 7
    const next = new Date(now)
    next.setUTCDate(now.getUTCDate() + daysUntilFriday)
    next.setUTCHours(12, 0, 0, 0)
    return next
  }
  const nextSettlement = getNextFriday()

  // Contract size = 100 for SUI market (matching on-chain)
  const CONTRACT_SIZE = 100

  const expectedPayouts = EXPIRING_POSITIONS.map(pos => {
    const payout = pos.type === 'CALL'
      ? Math.max(0, settlementPrice - pos.strike) * pos.qty * CONTRACT_SIZE
      : Math.max(0, pos.strike - settlementPrice) * pos.qty * CONTRACT_SIZE
    return { ...pos, calculatedPayout: +payout.toFixed(4) }
  })

  const totalCalculated = expectedPayouts.reduce((sum, p) => sum + p.calculatedPayout, 0)

  return (
    <div className="pt-20 md:pt-24 pb-12 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">

        {/* Countdown Hero */}
        <div className="card mb-8 md:mb-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="relative z-10">
            <CountdownTimer targetDate={nextSettlement} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 md:gap-8">

          {/* LEFT */}
          <div className="space-y-6 md:space-y-6">

            {/* Expiring Positions — labeled as example */}
            <div>
              <h2 className="font-syne font-bold text-xl md:text-2xl text-white mb-1">
                Positions Expiring This Week
              </h2>
              <p className="text-yellow-400/70 font-mono text-xs mb-4">
                ⚠️ Example positions — connect wallet to see your real positions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {expectedPayouts.map(pos => {
                  const isITM = pos.calculatedPayout > 0
                  return (
                    <div key={pos.id} className={cn('card p-4 md:p-5 hover-lift', isITM ? 'hover:border-profit/30' : 'hover:border-white/10')}>
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <span className={cn('text-xs font-mono font-bold px-2 py-1 rounded', pos.type === 'CALL' ? 'bg-profit/15 text-profit' : 'bg-danger/15 text-danger')}>
                          {pos.type}
                        </span>
                        <span className="text-text-secondary text-xs font-mono truncate">{pos.market}</span>
                      </div>
                      <div className="space-y-2 text-xs font-mono mb-3 md:mb-4">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Strike</span>
                          <span className="text-white">${pos.strike.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Current Price</span>
                          <span className="text-white">${settlementPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Qty × Size</span>
                          <span className="text-white">{pos.qty} × {CONTRACT_SIZE}</span>
                        </div>
                      </div>
                      <div className={cn('p-3 rounded-xl border', isITM ? 'border-profit/20 bg-profit/10' : 'border-white/10 bg-white/3')}>
                        <div className="text-text-secondary text-xs font-mono mb-1">Expected Payout</div>
                        <div className={cn('font-mono font-bold text-lg', isITM ? 'text-profit' : 'text-text-secondary')}>
                          {isITM ? '+' : ''}{pos.calculatedPayout.toFixed(4)} SUI
                        </div>
                        <div className={cn('text-xs font-mono mt-1', isITM ? 'text-profit/70' : 'text-text-secondary/50')}>
                          {isITM ? 'IN THE MONEY ✓' : 'OUT OF MONEY'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Settlement History — labeled as example */}
            <div>
              <h2 className="font-syne font-bold text-xl md:text-2xl text-white mb-1">Settlement History</h2>
              <p className="text-yellow-400/70 font-mono text-xs mb-4">
                ⚠️ Example data — real settlement history will appear here after options expire
              </p>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Date', 'Market', 'Strike', 'Result', 'Payout', 'Tx Hash'].map(h => (
                          <th key={h} className="px-3 md:px-4 py-3 text-left text-xs font-mono text-text-secondary whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SETTLEMENT_HISTORY.map((record, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-3 md:px-4 py-3 font-mono text-xs text-text-secondary whitespace-nowrap">{record.date}</td>
                          <td className="px-3 md:px-4 py-3 font-mono text-sm text-white whitespace-nowrap">{record.market}</td>
                          <td className="px-3 md:px-4 py-3 font-mono text-sm text-white">${record.strike.toFixed(2)}</td>
                          <td className="px-3 md:px-4 py-3">
                            <span className={cn('text-xs font-mono font-bold px-2 py-1 rounded flex items-center gap-1 w-fit', record.result === 'ITM' ? 'bg-profit/15 text-profit' : 'bg-danger/15 text-danger')}>
                              {record.result === 'ITM' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {record.result}
                            </span>
                          </td>
                          <td className={cn('px-3 md:px-4 py-3 font-mono text-sm font-bold whitespace-nowrap', record.payout > 0 ? 'text-profit' : 'text-text-secondary')}>
                            {record.payout > 0 ? `+${record.payout.toFixed(4)}` : '0.0000'} SUI
                          </td>
                          <td className="px-3 md:px-4 py-3">
                            <a href="#" className="flex items-center gap-1 font-mono text-xs text-primary hover:text-primary/70 transition-colors whitespace-nowrap">
                              {record.txHash} <ExternalLink size={10} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Payout Calculator + Claim */}
          <div className="space-y-4 md:space-y-5">

            <div className="card p-4 md:p-5">
              <h3 className="font-syne font-semibold text-white mb-1">Payout Calculator</h3>
              <p className="text-text-secondary font-mono text-xs mb-4">Based on {CONTRACT_SIZE}x contract size per position</p>
              <div className="mb-4">
                <label className="text-text-secondary text-xs font-mono block mb-2">Expected Price at Expiry</label>
                <input
                  type="range" min="0.50" max="1.00" step="0.01"
                  value={settlementPrice}
                  onChange={e => setSettlementPrice(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs font-mono text-text-secondary mt-1">
                  <span>$0.50</span>
                  <span className="text-primary font-bold">${settlementPrice.toFixed(2)}</span>
                  <span>$1.00</span>
                </div>
              </div>
              <div className="flex justify-between gap-1 mb-4 md:mb-5">
                {[0.55, 0.65, 0.75, 0.90].map(p => (
                  <button key={p} onClick={() => setSettlementPrice(p)}
                    className="flex-1 py-1.5 text-xs font-mono rounded bg-white/5 text-text-secondary hover:bg-primary/15 hover:text-primary transition-all min-h-[32px]">
                    ${p.toFixed(2)}
                  </button>
                ))}
              </div>
              <div className="space-y-2 mb-4 md:mb-5">
                {expectedPayouts.map(pos => (
                  <div key={pos.id} className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-background/50">
                    <span className={cn('font-bold', pos.type === 'CALL' ? 'text-profit' : 'text-danger')}>
                      {pos.type} ${pos.strike.toFixed(2)}
                    </span>
                    <span className={cn('font-bold', pos.calculatedPayout > 0 ? 'text-profit' : 'text-text-secondary')}>
                      {pos.calculatedPayout > 0 ? '+' : ''}{pos.calculatedPayout.toFixed(4)} SUI
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-secondary text-xs font-mono">Total Expected Payout</span>
                  <span className="text-xs font-mono text-text-secondary">Example only</span>
                </div>
                <div className={cn('font-mono font-bold text-2xl md:text-3xl', totalCalculated > 0 ? 'text-profit' : 'text-text-secondary')}>
                  {totalCalculated > 0 ? '+' : ''}{totalCalculated.toFixed(4)} SUI
                </div>
              </div>
            </div>

            {account ? (
              <button
                onClick={() => {
                  toast.loading('Claiming settlement...')
                  setTimeout(() => { toast.dismiss(); toast.success('Settlement claimed successfully!') }, 2000)
                }}
                className="w-full py-4 rounded-xl bg-primary text-white font-syne font-bold text-lg hover:shadow-glow-indigo transition-all min-h-[52px]"
              >
                Claim Settled Options
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-text-secondary font-mono text-sm">Connect wallet to claim settlements</p>
                <ConnectButton />
              </div>
            )}

            <div className="card p-4 md:p-5 space-y-3 text-xs font-mono">
              <div className="text-text-secondary font-syne font-semibold text-sm mb-2">Settlement Info</div>
              {[
                ['Settlement Type', 'Cash-settled'],
                ['Oracle', 'Pyth Network'],
                ['Settlement Time', '12:00 UTC Friday'],
                ['Contract Size', `${CONTRACT_SIZE}x per contract`],
                ['Gas Fee', '~0.001 SUI'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-text-secondary">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}