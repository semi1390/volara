'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Brain, AlertCircle } from 'lucide-react'
import { POOL_STATS } from '@/lib/dummy-data'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import toast from 'react-hot-toast'
import { getPoolAdvisorInsight } from '@/lib/claude'
import { cn } from '@/lib/utils'

const ANALYTICS_DATA = Array.from({ length: 12 }, (_, i) => ({
  date: ['May 14', 'May 21', 'May 28', 'Jun 4', 'Jun 11', 'Jun 18', 'Jun 25', 'Jul 2', 'Jul 9', 'Jul 16', 'Jul 23', 'Jul 30'][i],
  apy: [18, 22, 19, 25, 27, 24, 28, 30, 26, 22, 24, 22.4][i],
  liquidity: [45, 52, 58, 67, 74, 78, 82, 89, 85, 87, 88, 89][i],
  utilization: [35, 38, 42, 48, 51, 45, 50, 55, 47, 44, 46, 45][i],
}))

function RiskMeter({ level }: { level: 'LOW' | 'MED' | 'HIGH' }) {
  const position = level === 'LOW' ? 16 : level === 'MED' ? 50 : 84
  return (
    <div>
      <div className="flex justify-between text-xs font-mono text-text-secondary mb-2">
        <span>LOW</span><span>MED</span><span>HIGH</span>
      </div>
      <div className="relative h-3 bg-card rounded-full overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-profit via-yellow-400 to-danger opacity-60 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-card shadow-lg transition-all duration-500"
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>
      <div className={cn('mt-2 text-center text-sm font-mono font-bold',
        level === 'LOW' ? 'text-profit' : level === 'MED' ? 'text-yellow-400' : 'text-danger'
      )}>
        {level}
      </div>
    </div>
  )
}

export default function LiquidityPage() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [userShares, setUserShares] = useState(0)

  const { data: poolData, refetch: refetchPool } = useSuiClientQuery('getObject', {
    id: process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID!,
    options: { showContent: true },
  })

  const { data: balanceData } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '' },
    { enabled: !!account?.address }
  )

  // Fetch user LP shares directly from the pool's lp_shares table
  // Table<address, u64> — key is user address
 useEffect(() => {
  if (!account?.address || !process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID) return
  const fetchShares = async () => {
    try {
      const tx = new Transaction()
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::liquidity_pool::get_lp_share`,
        arguments: [
          tx.object(process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID!),
          tx.pure.address(account.address),
        ],
      })
      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: account.address,
      })
      const returnVal = result?.results?.[0]?.returnValues?.[0]
      if (returnVal) {
        const bytes = returnVal[0]
        const shares = parseInt(
          bytes.reduce((acc: bigint, byte: number, i: number) =>
            acc + (BigInt(byte) << BigInt(8 * i)), BigInt(0)).toString()
        )
        setUserShares(shares)
      } else {
        setUserShares(0)
      }
    } catch {
      setUserShares(0)
    }
  }
  fetchShares()
}, [account?.address, poolData, client])

  const poolFields = poolData?.data?.content?.dataType === 'moveObject'
    ? (poolData.data.content.fields as any)
    : null

  const poolBalanceMist = parseInt(poolFields?.balance ?? '0')
  const poolBalance = (poolBalanceMist / 1_000_000_000).toFixed(2)
  const totalPremiums = parseInt(poolFields?.total_premiums_collected ?? '0') / 1_000_000_000
  const totalShares = parseInt(poolFields?.total_shares ?? '0')
  const totalExposure = parseInt(poolFields?.total_exposure ?? '0')
  const realPoolBalance = parseFloat(poolBalance)

  const realUtilization = poolBalanceMist > 0
    ? Math.min((totalExposure / poolBalanceMist) * 100, 100).toFixed(0)
    : '0'

  const hasRealHistory = totalPremiums > 0 && realPoolBalance > 0.1
  const realAPY = hasRealHistory
    ? Math.min(((totalPremiums / realPoolBalance) * 52 * 100), 200).toFixed(1)
    : null

  const walletBalance = balanceData
    ? parseFloat((parseInt(balanceData.totalBalance) / 1_000_000_000).toFixed(4))
    : 0

  // Calculate user's SUI value from shares
  const userDepositValue = totalShares > 0 && poolBalanceMist > 0 && userShares > 0
    ? ((userShares / totalShares) * realPoolBalance).toFixed(4)
    : '0.0000'

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [insight, setInsight] = useState<any>(null)
  const [analyticsFilter, setAnalyticsFilter] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('ALL')

  useEffect(() => {
    getPoolAdvisorInsight({
      utilization: parseFloat(realUtilization),
      weeklyVolume: 18360000,
      apy: realAPY ? parseFloat(realAPY) : POOL_STATS.apy,
    }).then(setInsight)
  }, [realUtilization, realAPY])

  const apyForCalc = realAPY ? parseFloat(realAPY) : POOL_STATS.apy
  const weeklyYieldPct = apyForCalc / 52
  const estimatedWeekly = amount ? ((parseFloat(amount) || 0) * weeklyYieldPct / 100).toFixed(4) : '0.0000'
  const estimatedMonthly = amount ? ((parseFloat(amount) || 0) * apyForCalc / 100 / 12).toFixed(4) : '0.0000'

  const handleDeposit = () => {
    if (!account) { toast.error('Connect your wallet first!'); return }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter an amount'); return }
    if (parseFloat(amount) > walletBalance) { toast.error(`Insufficient balance. You have ${walletBalance} SUI`); return }

    const tx = new Transaction()
    const amountMist = Math.floor(parseFloat(amount) * 1_000_000_000)
    const [coin] = tx.splitCoins(tx.gas, [amountMist])
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::liquidity_pool::deposit`,
      arguments: [tx.object(process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID!), coin],
    })
    toast.loading('Depositing SUI into pool...')
    signAndExecute({ transaction: tx as any }, {
      onSuccess: (result) => {
        toast.dismiss()
        if ((result as any).effects?.status?.status === 'failure') {
          toast.error(`Deposit failed: ${(result as any).effects?.status?.error?.slice(0, 80) ?? 'Unknown'}`)
          return
        }
        toast.success('Deposited successfully! 🎉')
        setAmount('')
        refetchPool()
      },
      onError: (e) => {
        toast.dismiss()
        const msg = e.message || ''
        if (msg.includes('EPoolPaused')) toast.error('Pool is currently paused.')
        else if (msg.includes('reject') || msg.includes('cancel')) toast.error('Transaction rejected.')
        else toast.error(`Failed: ${msg.slice(0, 80)}`)
      },
    })
  }

  const handleWithdraw = () => {
    if (!account) { toast.error('Connect your wallet first!'); return }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter an amount'); return }
    if (userShares === 0) { toast.error('You have no shares to withdraw'); return }

    const tx = new Transaction()
    const sharesToWithdraw = totalShares > 0 && poolBalanceMist > 0
      ? Math.floor((parseFloat(amount) / realPoolBalance) * totalShares)
      : Math.floor(parseFloat(amount) * 1_000_000_000)

    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::liquidity_pool::withdraw`,
      arguments: [
        tx.object(process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ID!),
        tx.pure.u64(sharesToWithdraw),
      ],
    })
    toast.loading('Withdrawing SUI from pool...')
    signAndExecute({ transaction: tx as any }, {
      onSuccess: (result) => {
        toast.dismiss()
        if ((result as any).effects?.status?.status === 'failure') {
          toast.error(`Withdraw failed: ${(result as any).effects?.status?.error?.slice(0, 80) ?? 'Unknown'}`)
          return
        }
        toast.success('Withdrawn successfully! 🎉')
        setAmount('')
        refetchPool()
      },
      onError: (e) => {
        toast.dismiss()
        const msg = e.message || ''
        if (msg.includes('EInsufficientShares') || msg.includes('shares')) toast.error('Insufficient shares to withdraw.')
        else if (msg.includes('reject') || msg.includes('cancel')) toast.error('Transaction rejected.')
        else toast.error(`Failed: ${msg.slice(0, 80)}`)
      },
    })
  }

  return (
    <div className="pt-20 md:pt-24 pb-12 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">

        <div className="mb-8 md:mb-10">
          <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-white mb-2 md:mb-3">Provide Liquidity</h1>
          <p className="text-text-secondary font-mono text-sm">Earn fees by supplying SUI to the Volara options pool.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 md:mb-10">
          <div className="card p-4 md:p-5">
            <div className="text-text-secondary text-xs font-mono mb-2 md:mb-3">Pool Balance</div>
            <div className="font-mono font-bold text-xl md:text-2xl mb-1 text-white">{poolBalance} SUI</div>
            <div className="text-text-secondary text-xs font-mono">Total deposited</div>
          </div>
          <div className="card p-4 md:p-5">
            <div className="text-text-secondary text-xs font-mono mb-2 md:mb-3">Your Deposit</div>
            <div className="font-mono font-bold text-xl md:text-2xl mb-1 text-profit">
              {account ? `${userDepositValue} SUI` : '—'}
            </div>
            <div className="text-text-secondary text-xs font-mono">
              {account ? (userShares > 0 ? 'Your share of pool' : 'No deposit yet') : 'Connect wallet'}
            </div>
          </div>
          <div className="card p-4 md:p-5">
            <div className="text-text-secondary text-xs font-mono mb-2 md:mb-3">Pool Utilization</div>
            <div className={cn('font-mono font-bold text-xl md:text-2xl mb-1',
              parseFloat(realUtilization) < 40 ? 'text-profit' : parseFloat(realUtilization) < 70 ? 'text-yellow-400' : 'text-danger'
            )}>{realUtilization}%</div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-mono',
              parseFloat(realUtilization) < 40 ? 'bg-profit/15 text-profit' : parseFloat(realUtilization) < 70 ? 'bg-yellow-400/15 text-yellow-400' : 'bg-danger/15 text-danger'
            )}>
              {parseFloat(realUtilization) < 40 ? 'LOW' : parseFloat(realUtilization) < 70 ? 'MED' : 'HIGH'}
            </span>
          </div>
          <div className="card p-4 md:p-5">
            <div className="text-text-secondary text-xs font-mono mb-2 md:mb-3">APY (From Premiums)</div>
            <div className="font-mono font-bold text-xl md:text-2xl mb-1 text-profit">{realAPY ? `${realAPY}%` : '—'}</div>
            <div className="text-text-secondary text-xs font-mono">{realAPY ? 'From real premiums' : 'No trading history yet'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 md:gap-8">
          <div className="space-y-6">
            <div className="card p-5 md:p-6">
              <div className="flex gap-1 mb-5 md:mb-6 bg-background rounded-xl p-1">
                {(['deposit', 'withdraw'] as const).map(tab => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setAmount('') }}
                    className={cn('flex-1 py-2.5 rounded-lg text-sm font-mono font-medium capitalize transition-all min-h-[40px]',
                      activeTab === tab ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'
                    )}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="text-text-secondary text-xs font-mono block mb-2">
                  Amount (SUI)
                  {account && <span className="ml-2 text-primary">Balance: {walletBalance} SUI</span>}
                </label>
                <div className="flex items-center gap-3 bg-background border border-white/10 rounded-xl px-4 py-3">
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number"
                    className="flex-1 bg-transparent font-mono text-white text-xl focus:outline-none placeholder-text-secondary/40 min-w-0" />
                  <span className="text-text-secondary font-mono text-sm flex-shrink-0">SUI</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {['25%', '50%', '75%', 'MAX'].map(pct => (
                    <button key={pct} onClick={() => {
                      const maxVal = activeTab === 'deposit' ? walletBalance * 0.95 : parseFloat(userDepositValue)
                      const p = pct === 'MAX' ? 1 : parseInt(pct) / 100
                      setAmount((maxVal * p).toFixed(4))
                    }} className="flex-1 py-1.5 text-xs font-mono rounded-lg bg-white/5 text-text-secondary hover:bg-primary/15 hover:text-primary transition-all min-h-[32px]">
                      {pct}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-background rounded-xl p-4 mb-4">
                <div className="text-text-secondary text-xs font-mono mb-3">ESTIMATED RETURNS</div>
                {realAPY ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-text-secondary text-xs font-mono mb-1">Weekly Yield</div>
                      <div className="text-profit font-mono font-bold text-lg md:text-xl">{estimatedWeekly} <span className="text-xs text-text-secondary">SUI</span></div>
                    </div>
                    <div>
                      <div className="text-text-secondary text-xs font-mono mb-1">Monthly Estimate</div>
                      <div className="text-profit font-mono font-bold text-lg md:text-xl">{estimatedMonthly} <span className="text-xs text-text-secondary">SUI</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-text-secondary text-xs font-mono">Returns will show after trading activity begins. LPs earn 100% of option premiums.</div>
                )}
              </div>

              <div className="mb-5 md:mb-6">
                <div className="text-text-secondary text-xs font-mono mb-3">RISK LEVEL</div>
                <RiskMeter level={parseFloat(realUtilization) < 40 ? 'LOW' : parseFloat(realUtilization) < 70 ? 'MED' : 'HIGH'} />
              </div>

              <button onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                className="w-full py-4 rounded-xl bg-primary text-white font-syne font-bold text-lg hover:shadow-glow-indigo transition-all min-h-[52px]">
                {activeTab === 'deposit' ? 'Deposit SUI' : 'Withdraw SUI'}
              </button>

              {!account && <p className="text-center text-text-secondary text-xs font-mono mt-3">Connect your wallet to deposit</p>}
            </div>

            <div className="card p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-syne font-bold text-lg md:text-xl text-white">Pool Analytics</h3>
                <div className="flex gap-1 overflow-x-auto">
                  {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map(f => (
                    <button key={f} onClick={() => setAnalyticsFilter(f)}
                      className={cn('px-2.5 md:px-3 py-1 rounded-lg text-xs font-mono transition-all flex-shrink-0',
                        analyticsFilter === f ? 'bg-primary/15 text-primary border border-primary/30' : 'text-text-secondary hover:text-white'
                      )}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="text-xs font-mono text-yellow-400/70 mb-4 flex items-center gap-1">
                ⚠️ Projected data — based on protocol targets, not historical performance
              </div>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={ANALYTICS_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="liqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontFamily: 'IBM Plex Mono', fontSize: '12px' }} labelStyle={{ color: '#FFFFFF' }} />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="apy" stroke="#10B981" fill="url(#apyGrad)" strokeWidth={2} name="APY %" />
                    <Area type="monotone" dataKey="liquidity" stroke="#6366F1" fill="url(#liqGrad)" strokeWidth={2} name="Liquidity $M" />
                    <Area type="monotone" dataKey="utilization" stroke="#F59E0B" fill="url(#utilGrad)" strokeWidth={2} name="Utilization %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-5">
            <div className="ai-box p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} className="text-primary" />
                <span className="text-primary font-mono text-xs font-bold">Volara AI Pool Insight</span>
              </div>
              {insight ? (
                <>
                  <p className="text-white font-mono text-sm leading-relaxed mb-4">{insight.insight}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <div className="text-text-secondary mb-1">Expected Weekly Yield</div>
                      <div className="text-profit font-bold text-lg">{insight.weekly_yield}%</div>
                    </div>
                    <div>
                      <div className="text-text-secondary mb-1">Risk Level</div>
                      <div className={cn('font-bold text-lg', insight.risk_level === 'LOW' ? 'text-profit' : insight.risk_level === 'MED' ? 'text-yellow-400' : 'text-danger')}>
                        {insight.risk_level}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
                      <span>Confidence</span><span>{insight.confidence}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-profit rounded-full" style={{ width: `${insight.confidence}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-primary text-sm font-mono">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Analyzing pool conditions...
                </div>
              )}
            </div>

            <div className="card p-4 md:p-5 space-y-4">
              <h3 className="font-syne font-semibold text-white">Pool Information</h3>
              {[
                { label: 'Protocol', value: 'Volara v1' },
                { label: 'Network', value: 'Sui Testnet' },
                { label: 'Asset', value: 'SUI' },
                { label: 'Lock Period', value: 'None' },
                { label: 'Fee Share', value: '100% to LPs' },
                { label: 'Settlement', value: 'Auto on expiry' },
                { label: 'Max Utilization', value: '70%' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 p-4 bg-yellow-400/5 border border-yellow-400/20 rounded-xl">
              <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400/80 text-xs font-mono leading-relaxed">
                Liquidity providers may experience losses if option payouts exceed pool earnings. Always understand the risk before depositing. This is testnet — no real funds at risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}