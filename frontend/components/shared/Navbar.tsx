'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { usePrices } from '@/hooks/usePrices'

const NAV_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/trade', label: 'Trade' },
  { href: '/liquidity', label: 'Liquidity' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/settlement', label: 'Settlement' },
  { href: '/insights', label: 'AI Insights', isNew: true },
]

function PriceTicker() {
  const { prices } = usePrices()
  const items = [
    { label: 'SUI', price: prices.sui.price, change: prices.sui.change24h },
    { label: 'DEEP', price: prices.deep.price, change: prices.deep.change24h },
    { label: 'CETUS', price: prices.cetus.price, change: prices.cetus.change24h },
    { label: 'SUI', price: prices.sui.price, change: prices.sui.change24h },
    { label: 'DEEP', price: prices.deep.price, change: prices.deep.change24h },
    { label: 'CETUS', price: prices.cetus.price, change: prices.cetus.change24h },
    { label: 'SUI', price: prices.sui.price, change: prices.sui.change24h },
    { label: 'DEEP', price: prices.deep.price, change: prices.deep.change24h },
    { label: 'CETUS', price: prices.cetus.price, change: prices.cetus.change24h },
  ]

  return (
    <div className="w-full bg-card/40 border-b border-white/5 overflow-hidden h-8 flex items-center">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6 border-r border-white/5">
            <span className="text-text-secondary font-mono text-xs">{item.label}/USD</span>
            <span className="text-white font-mono text-xs font-bold">
              ${item.price > 0 ? item.price.toFixed(4) : '—'}
            </span>
            <span className={cn(
              'font-mono text-xs',
              item.change >= 0 ? 'text-profit' : 'text-danger'
            )}>
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const account = useCurrentAccount()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Price ticker */}
      <PriceTicker />

      {/* Main navbar */}
      <nav className={cn(
        'transition-all duration-300',
        scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      )}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:shadow-glow-indigo group-hover:scale-110 transition-all duration-200">
              <Zap size={16} className="text-primary group-hover:text-white transition-colors" />
            </div>
            <span className="font-syne font-bold text-xl text-white tracking-tight group-hover:text-primary transition-colors duration-200">Volara</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-mono transition-all relative',
                  pathname === link.href
                    ? 'text-white bg-primary/15 border border-primary/30 shadow-glow-indigo'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                )}
              >
                {link.label}
                {link.isNew && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold px-1 rounded-full animate-pulse">
                    NEW
                  </span>
                )}
                {/* Active indicator underline */}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Testnet badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit/10 border border-profit/20">
              <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
              <span className="text-xs text-profit font-mono">Sui Testnet</span>
            </div>

            {/* Connect button wrapper — adds gradient glow effect */}
            <div className={cn(
              'scale-[0.78] origin-right md:scale-100',
              '[&_button]:!bg-gradient-to-r [&_button]:!from-primary [&_button]:!to-violet-500',
              '[&_button]:!border-0 [&_button]:!shadow-glow-indigo',
              '[&_button]:hover:!opacity-90 [&_button]:!transition-all',
              '[&_button]:!font-mono [&_button]:!text-sm',
            )}>
              <ConnectButton />
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-2 flex-shrink-0"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <div className={cn('w-5 h-0.5 bg-white transition-all', mobileOpen && 'rotate-45 translate-y-2')} />
              <div className={cn('w-5 h-0.5 bg-white transition-all', mobileOpen && 'opacity-0')} />
              <div className={cn('w-5 h-0.5 bg-white transition-all', mobileOpen && '-rotate-45 -translate-y-2')} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/5 px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-4 py-3 rounded-lg text-sm font-mono transition-all',
                pathname === link.href
                  ? 'text-white bg-primary/15 border border-primary/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
            <span className="text-xs text-profit font-mono">Sui Testnet</span>
          </div>
        </div>
      )}
    </div>
  )
}