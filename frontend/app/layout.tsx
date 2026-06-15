import './globals.css'
import type { Metadata } from 'next'
import Providers from '@/components/shared/Providers'

export const metadata: Metadata = {
  title: 'Volara — Hedge smarter. Trade better.',
  description: 'Decentralized options trading on Sui with AI-powered pricing, instant settlement, and institutional-grade liquidity.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="bg-background text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}