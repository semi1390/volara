'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import '@mysten/dapp-kit/dist/index.css'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/shared/Navbar'

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('MetaMask')) {
        event.preventDefault()
      }
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [])

  return (
    <html lang="en">
      <head>
        <title>Volara — Hedge smarter. Trade better.</title>
        <meta name="description" content="Decentralized options trading on Sui with AI-powered pricing, instant settlement, and institutional-grade liquidity." />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-background text-text-primary antialiased">
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider networks={networks} defaultNetwork="testnet">
            <WalletProvider>
              <div className="min-h-screen bg-background">
                <Navbar />
                <main>{children}</main>
              </div>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#1A1A2E',
                    color: '#FFFFFF',
                    border: '1px solid rgba(99,102,241,0.3)',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '13px',
                  },
                }}
              />
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}