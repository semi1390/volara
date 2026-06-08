import { useState, useEffect } from 'react'
import { ORDER_BOOK } from '@/lib/dummy-data'

interface OrderBookEntry {
  price: number
  size: number
  total: number
}

interface OrderBookData {
  asks: OrderBookEntry[]
  bids: OrderBookEntry[]
  markPrice: number
}

export function useOrderBook(symbol: string) {
  const [orderBook, setOrderBook] = useState<OrderBookData>(ORDER_BOOK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const coinId = symbol === 'sui-usdc' ? 'sui'
          : symbol === 'deep-usdc' ? 'deepbook'
          : 'cetus-protocol'

        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
        )
        const data = await res.json()
        const price = data[coinId]?.usd
        if (!price) throw new Error('No price')

        const spread = price * 0.001

        let askTotal = 0
        const asks: OrderBookEntry[] = Array.from({ length: 8 }, (_, i) => {
          const p = +(price + spread * (i + 1)).toFixed(4)
          const size = Math.floor(Math.random() * 15000 + 3000)
          askTotal += size
          return { price: p, size, total: askTotal }
        })

        let bidTotal = 0
        const bids: OrderBookEntry[] = Array.from({ length: 8 }, (_, i) => {
          const p = +(price - spread * (i + 1)).toFixed(4)
          const size = Math.floor(Math.random() * 15000 + 3000)
          bidTotal += size
          return { price: p, size, total: bidTotal }
        })

        setOrderBook({ asks, bids, markPrice: price })
      } catch {
        setOrderBook(ORDER_BOOK)
      } finally {
        setLoading(false)
      }
    }

    fetchOrderBook()
    const interval = setInterval(fetchOrderBook, 15000)
    return () => clearInterval(interval)
  }, [symbol])

  return { orderBook, loading }
}