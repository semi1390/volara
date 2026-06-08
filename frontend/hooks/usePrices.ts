import { useEffect, useState } from 'react'

interface Prices {
  sui: { price: number; change24h: number }
  deep: { price: number; change24h: number }
  cetus: { price: number; change24h: number }
}

const DEFAULT_PRICES: Prices = {
  sui: { price: 1.93, change24h: 4.24 },
  deep: { price: 0.121, change24h: -2.18 },
  cetus: { price: 0.256, change24h: 6.71 },
}

export function usePrices() {
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=sui,deepbook,cetus-protocol&vs_currencies=usd&include_24hr_change=true'
        )
        const data = await res.json()
        setPrices({
          sui: {
            price: data?.sui?.usd ?? DEFAULT_PRICES.sui.price,
            change24h: data?.sui?.usd_24h_change ?? DEFAULT_PRICES.sui.change24h,
          },
          deep: {
            price: data?.deepbook?.usd ?? DEFAULT_PRICES.deep.price,
            change24h: data?.deepbook?.usd_24h_change ?? DEFAULT_PRICES.deep.change24h,
          },
          cetus: {
            price: data?.['cetus-protocol']?.usd ?? DEFAULT_PRICES.cetus.price,
            change24h: data?.['cetus-protocol']?.usd_24h_change ?? DEFAULT_PRICES.cetus.change24h,
          },
        })
      } catch {
        // fallback to defaults on error
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [])

  return { prices, loading }
}