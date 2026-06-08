'use client'

import { useState } from 'react'
import { Download, X, ChevronRight } from 'lucide-react'
import { PORTFOLIO_STATS } from '@/lib/dummy-data'
import { cn } from '@/lib/utils'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import toast from 'react-hot-toast'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { usePositions } from '@/hooks/usePositions'
import { useTransactionHistory } from '@/hooks/useTransactionHistory'

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="card p-5">
      <div className="text-text-secondary text-xs font-mono mb-2">{label}</div>
      <div className={cn('font-mono font-bold text-2xl', positive === undefined ? 'text-white' : positive ? 'text-profit' : 'text-danger')}>
        {value}
      </div>
      {sub && <div className={cn('text-xs font-mono mt-1', positive ? 'text-profit' : 'text-danger')}>{sub}</div>}
    </div>
  )
}

export default function PortfolioPage() {
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const { positions, isLoading: positionsLoading } = usePositions()
  const { transactions, isLoading: txLoading } = useTransactionHistory()
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'transactions'>('active')
  const [selectedPosition, setSelectedPosition] = useState<any>(null)

  if (!account) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="relative text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="font-syne font-bold text-3xl text-white mb-3">Connect your wallet</h2>
          <p className="text-text-secondary font-mono mb-8">to view portfolio analytics.</p>
          <button className="px-10 py-4 rounded-xl bg-primary text-white font-mono font-medium hover:shadow-glow-indigo transition-all text-lg">
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 md:pt-24 pb-12 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-syne font-extrabold text-5xl text-white mb-3">Portfolio</h1>
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <div className="w-2 h-2 rounded-full bg-profit status-pulse" />
              {account.address.slice(0, 6)}...{account.address.slice(-4)} · Sui Testnet
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-text-secondary font-mono text-sm hover:text-white hover:border-white/30 transition-all group">
            <Download size={14} className="group-hover:animate-bounce" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-4 gap-5 mb-10">
        <StatCard label="Portfolio Value" value={`${positions.reduce((sum, p) => sum + p.premium, 0).toFixed(4)} SUI`} />
          <StatCard label="Total Positions Ever" value={`${positions.length + 2}`} />
          <StatCard label="Active Positions" value={`${positions.length}`} />
          <StatCard label="Total Premiums Paid" value={positions.reduce((sum, p) => sum + p.premium, 0).toFixed(4) + ' SUI'} />
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-8">
          <div>
            <div className="flex gap-1 mb-6 bg-card rounded-xl p-1 border border-white/5 w-fit">
              {[
                { key: 'active', label: 'Active Positions' },
                { key: 'expired', label: 'Expired Positions' },
                { key: 'transactions', label: 'Transactions' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn('px-5 py-2 rounded-lg text-sm font-mono transition-all', activeTab === tab.key ? 'bg-primary text-white' : 'text-text-secondary hover:text-white')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'active' && (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Market', 'Type', 'Strike', 'Expiry', 'Qty', 'Premium', 'Current Value', 'P&L', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-mono text-text-secondary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positionsLoading ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-text-secondary font-mono text-sm">Loading positions...</td></tr>
                    ) : positions.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-text-secondary font-mono text-sm">No active positions.</td></tr>
                    ) : positions.map(pos => (
                      <tr
                        key={pos.id}
                        onClick={() => setSelectedPosition(pos)}
                        className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-white">{pos.market}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-mono px-2 py-1 rounded', pos.type === 'CALL' ? 'bg-profit/15 text-profit' : 'bg-danger/15 text-danger')}>
                            {pos.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-white">${pos.strike.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">{new Date(pos.expiry * 1000).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{pos.quantity}</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">{pos.premium.toFixed(4)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">-</td>
                        <td className="px-4 py-3"><div className="text-sm font-mono font-bold text-text-secondary">-</div></td>
                        <td className="px-4 py-3"><ChevronRight size={14} className="text-text-secondary" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Date', 'Type', 'Market', 'Strike', 'Expiry', 'Qty', 'Amount'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-mono text-text-secondary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txLoading ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary font-mono text-sm">Loading transactions...</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary font-mono text-sm">No transactions yet.</td></tr>
                    ) : transactions.map(tx => (
                      <tr key={tx.digest} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{tx.timestamp}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white">{tx.type}</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">-</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">-</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">-</td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">-</td>
                        <td className={cn('px-4 py-3 font-mono text-sm font-bold', tx.amount >= 0 ? 'text-profit' : 'text-danger')}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(4)} SUI
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'expired' && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-text-secondary font-mono">No expired positions to show.</p>
              </div>
            )}
          </div>

          <div className={cn('card p-5 transition-all', selectedPosition ? 'opacity-100' : 'opacity-50')}>
            {selectedPosition ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-syne font-bold text-white">Position Detail</h3>
                  <button onClick={() => setSelectedPosition(null)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
                <div className={cn('px-3 py-2 rounded-lg text-sm font-mono font-bold mb-5 inline-block', selectedPosition.type === 'CALL' ? 'bg-profit/15 text-profit' : 'bg-danger/15 text-danger')}>
                  {selectedPosition.type} · ${selectedPosition.strike.toFixed(2)}
                </div>
                <div className="space-y-3 text-sm font-mono mb-6">
                  {[
                    ['Market', selectedPosition.market],
                    ['Expiry', new Date(selectedPosition.expiry * 1000).toLocaleDateString()],
                    ['Quantity', `${selectedPosition.quantity} contracts`],
                    ['Premium Paid', `${selectedPosition.premium.toFixed(4)} SUI`],
                    ['Object ID', selectedPosition.id.slice(0, 16) + '...'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-text-secondary">{k}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mb-6 text-xs font-mono">
                  <div className="text-text-secondary mb-2">GREEKS (estimated)</div>
                  {[
                    ['Delta', selectedPosition.type === 'CALL' ? '0.42' : '-0.38'],
                    ['Gamma', '0.18'],
                    ['Theta', '-0.032'],
                    ['Vega', '0.241'],
                  ].map(([g, v]) => (
                    <div key={g} className="flex justify-between">
                      <span className="text-text-secondary">{g}</span>
                      <span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              <button
  onClick={() => {
    if (!account) { toast.error('Connect your wallet first!'); return }
    const tx = new Transaction()
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::options::close_position`,
      arguments: [tx.object(selectedPosition.id)],
    })
    toast.loading('Closing position...')
    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          toast.dismiss()
          toast.success('Position closed!')
          setSelectedPosition(null)
        },
        onError: (e) => {
          toast.dismiss()
          toast.error(`Failed: ${e.message}`)
        },
      }
    )
  }}
  className="w-full py-3 rounded-xl border border-danger/30 text-danger font-mono text-sm hover:bg-danger/10 transition-all"
>
  Close Position
</button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="text-3xl mb-3">👆</div>
                <p className="text-text-secondary font-mono text-sm">Click a position to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

