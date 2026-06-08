<div align="center">
  <img src="https://volara-gold.vercel.app/favicon.ico" width="64" height="64" />
  
  # Volara
  ### Decentralized Options Trading on Sui
  
  **Hedge smarter. Trade better.**
  
  [![Live Demo](https://img.shields.io/badge/Live%20Demo-volara--gold.vercel.app-6366f1?style=for-the-badge)](https://volara-gold.vercel.app)
  [![Sui Testnet](https://img.shields.io/badge/Sui-Testnet-4DA2FF?style=for-the-badge)](https://suiscan.xyz/testnet/account/0x343e6c91a00fa6208bfdffcd70899f90b904f5b664fc560baf90f2d861c69466)
  [![Built with Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)](https://nextjs.org)
</div>

---

## 🎯 What is Volara?

Volara is a fully on-chain decentralized options protocol built on Sui. It allows users to buy CALL and PUT options on Sui ecosystem tokens (SUI, DEEP, CETUS) with:

- **AI-powered pricing** via Claude (Volara AI) — real-time risk analysis, breakeven calculations, and probability estimates
- **On-chain settlement** — options settle automatically at expiry using Pyth Network price feeds
- **Deep liquidity pools** — LPs earn fees by providing liquidity to back option writers
- **Institutional-grade UX** — TradingView charts, real order book, options chain view

---

## 🚀 Live Demo

**→ [https://volara-gold.vercel.app](https://volara-gold.vercel.app)**

Connect your Slush wallet (Sui Testnet) to trade live options on-chain.

---

## 📸 Screenshots

| Landing | Trade Terminal | Options Chain |
|---------|---------------|---------------|
| Hero with live prices | Full 3-panel terminal | Strike/bid/ask table |

| Portfolio | Settlement | AI Insights |
|-----------|-----------|-------------|
| Real on-chain positions | Countdown + calculator | Claude-powered analysis |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)              │
│  Landing │ Markets │ Trade │ Liquidity │ Portfolio   │
│  Settlement │ AI Insights                             │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌───▼────┐
   │  Sui    │   │  Claude   │  │CoinGecko│
   │Testnet  │   │   API     │  │  API   │
   │(on-chain│   │(Volara AI)│  │(prices)│
   └────┬────┘   └───────────┘  └────────┘
        │
   ┌────▼──────────────────────────┐
   │     Move Smart Contracts       │
   │  liquidity_pool  │  options   │
   │  settlement      │  fees      │
   │  order_book                   │
   └───────────────────────────────┘
        │
   ┌────▼────┐
   │  Pyth   │
   │ Oracle  │
   │(prices) │
   └─────────┘
```

---

## 📦 Smart Contracts (Sui Testnet)

| Contract | Object ID |
|----------|-----------|
| **Package** | `0x343e6c91a00fa6208bfdffcd70899f90b904f5b664fc560baf90f2d861c69466` |
| **LiquidityPool** | `0xbbbe5bbf2363ec6b905e2b85704d13a006757451d397368ce5caafd2881d5e3c` |
| **SettlementRegistry** | `0x62ab0d9d226079a3a29d571a247d63e949abfe8aa65afd20b12a74b8ac7c57e9` |
| **OrderBook** | `0xf4d384adc7c41d3d0c202f54bca33ad38346ea1f832517cf3e700ea091bc79f4` |
| **Treasury** | `0x0a43637a89072d6a660702fc92e1562321ef90ed786ade84363453316b1802df` |

### Modules
- `liquidity_pool.move` — LP deposits, withdrawals, share tracking
- `options.move` — CALL/PUT option minting, buying, closing
- `settlement.move` — Automatic settlement at expiry with Pyth oracle price
- `fees.move` — 0.3% trade fee + 0.1% settlement fee
- `order_book.move` — On-chain order placement and matching

---

## ✨ Features

### 🎯 Trading
- Buy CALL and PUT options on SUI/USDC, DEEP/USDC, CETUS/USDC
- Real-time order book built around live CoinGecko prices
- TradingView candlestick charts (real market data)
- Options chain view — all strikes, bids, asks, and delta in one table
- Slippage-protected execution via Sui PTBs

### 🧠 Volara AI (Powered by Claude)
- Real-time trade analysis with confidence scores
- Probability of profit calculations
- Breakeven price calculations
- Risk level assessment (Low/Medium/High)
- Pool liquidity insights for LPs

### 💰 Liquidity
- Provide SUI liquidity to earn premiums
- Real pool balance read from chain
- Pool utilization tracking
- AI-powered pool health insights

### 📊 Portfolio
- Real positions fetched from wallet on-chain
- Transaction history from Sui RPC
- Position P&L tracking
- CSV export

### ⏰ Settlement
- Countdown to next Friday 12:00 UTC settlement
- Interactive payout calculator
- One-click claim for ITM options
- Settlement history

### 🤖 Keeper Bot
Automated settlement keeper that:
- Monitors expired options every 60 seconds
- Fetches price from Pyth Network
- Triggers on-chain settlement automatically
- Sends Telegram notifications

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Sui Testnet (Move 2024) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | @mysten/dapp-kit, Slush Wallet |
| Charts | TradingView Widget |
| Prices | CoinGecko API, Pyth Network |
| AI | Anthropic Claude (claude-haiku-4-5) |
| Deployment | Vercel (frontend), Railway (keeper) |

---

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- Sui CLI
- Slush Wallet (browser extension)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your .env.local values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Keeper Bot

```bash
cd keeper
npm install
cp env.example .env
# Fill in KEEPER_PRIVATE_KEY and TELEGRAM credentials
npm start
```

### Environment Variables

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x343e...
NEXT_PUBLIC_LIQUIDITY_POOL_ID=0xbbbe...
NEXT_PUBLIC_SETTLEMENT_REGISTRY_ID=0x62ab...
NEXT_PUBLIC_ORDER_BOOK_ID=0xf4d3...
NEXT_PUBLIC_TREASURY_ID=0x0a43...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🗺️ Roadmap

- [x] Core options protocol on Sui Testnet
- [x] AI-powered trade analysis
- [x] Real-time order book
- [x] TradingView charts
- [x] Options chain view
- [x] Automated keeper bot
- [x] Pyth oracle integration
- [ ] Mainnet deployment
- [ ] More markets (WAL, NAVX)
- [ ] Options chain Greeks (Delta, Gamma, Theta)
- [ ] WebSocket real-time updates
- [ ] Mobile app

---
## ⚡ Why Sui?

Most options protocols store positions as account balance mappings.
On Volara, each option is a native Move object in your wallet.

This enables:
- **Transferable positions** — send your option to anyone
- **Object-native ownership** — no synthetic abstractions
- **Parallel settlement** — multiple options settle simultaneously
- **Composability** — options can be used in other protocols
- **Sub-second finality** — instant settlement at expiry

This is not possible on EVM chains without significant complexity.

---
## 🏆 Sui Overflow Hackathon

Built for **Sui Overflow 2026** hackathon.

**Track:** DeFi

**Key innovations:**
1. First options protocol on Sui with AI-powered pricing
2. Automated keeper bot for trustless settlement
3. Options chain view with real bid/ask/delta
4. Integrated Pyth oracle for manipulation-resistant prices

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built with ❤️ on Sui
  
  [Live Demo](https://volara-gold.vercel.app) · [GitHub](https://github.com/semi1390/volara) · [Sui Explorer](https://suiscan.xyz/testnet/account/0x343e6c91a00fa6208bfdffcd70899f90b904f5b664fc560baf90f2d861c69466)
</div>