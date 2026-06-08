'use client'

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

export default function Providers({ children }: { children: React.ReactNode }) {
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
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main>{children}</main>
            <div className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 font-mono text-xs">
              ⚠️ Testnet — Experimental Software
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
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}