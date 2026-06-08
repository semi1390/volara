'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'

const NAV_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/trade', label: 'Trade' },
  { href: '/liquidity', label: 'Liquidity' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/settlement', label: 'Settlement' },
  { href: '/insights', label: 'AI Insights', isNew: true },
]

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
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
    )}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:shadow-glow-indigo transition-all">
            <Zap size={16} className="text-primary" />
          </div>
          <span className="font-syne font-bold text-xl text-white tracking-tight">Volara</span>
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
                  ? 'text-white bg-primary/15 border border-primary/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              {link.label}
              {link.isNew && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold px-1 rounded-full">
                  NEW
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit/10 border border-profit/20">
            <div className="w-1.5 h-1.5 rounded-full bg-profit status-pulse" />
            <span className="text-xs text-profit font-mono">Sui Testnet</span>
          </div>

          {/*
           * Scale ConnectButton to 78% on mobile, full size on md+.
           * origin-right anchors the scale to the right edge so it
           * stays flush against the hamburger and doesn't overlap the logo.
           * No clipping, no text cutoff — just smaller.
           */}
          <div className="scale-[0.78] origin-right md:scale-100">
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
    </nav>
  )
}