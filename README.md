# Volara — Decentralized Options on Sui

> **Hedge smarter. Trade better.**

Volara is a fully decentralized options trading protocol built on the Sui blockchain, featuring AI-powered pricing via Claude, instant settlement, and institutional-grade liquidity pools.

---

## Architecture Overview

```
/volara
  /move          — Sui Move smart contracts
  /frontend      — Next.js 14 App Router frontend
```

### Smart Contracts (Move)
| Module | Purpose |
|--------|---------|
| `liquidity_pool.move` | LP deposits, withdrawals, share tracking |
| `options.move` | Mint/burn CALL/PUT option objects |
| `order_book.move` | On-chain order matching |
| `settlement.move` | Auto-settle at expiry via oracle price |
| `fees.move` | 0.3% trade fee + 0.1% settlement fee |

### Frontend Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, stats, featured markets |
| `/trade` | 3-panel trading interface (order book + chart + positions) |
| `/markets` | Filterable market card grid |
| `/liquidity` | Deposit/withdraw with LP analytics |
| `/portfolio` | P&L overview, positions, transaction history |
| `/settlement` | Countdown timer, payout calculator, claim |
| `/insights` | Dedicated Claude AI analysis tool |

---

## Prerequisites

- Node.js 18+
- Sui CLI
- A Sui testnet wallet with SUI for gas

---

## Install Sui CLI

```bash
curl -fsSL https://install.sui.io | sh
sui --version
```

---

## Setup Sui Testnet Wallet

```bash
# Create a new wallet address
sui client new-address ed25519

# Switch to testnet
sui client switch --env testnet

# Get testnet SUI from faucet
sui client faucet

# Verify balance
sui client balance
```

---

## Deploy Move Contracts

```bash
cd move

# Build and verify
sui move build

# Run tests
sui move test

# Deploy to testnet (note the package ID from output)
sui client publish --gas-budget 100000000
```

After deploying, copy the **Package ID** from the output. You'll need it for the frontend `.env.local`.

---

## Install & Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your values:
# NEXT_PUBLIC_SUI_NETWORK=testnet
# NEXT_PUBLIC_PACKAGE_ID=<your deployed package id>
# ANTHROPIC_API_KEY=<your key from console.anthropic.com>
# NEXT_PUBLIC_PYTH_PRICE_FEED=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUI_NETWORK` | Yes | `testnet` or `mainnet` |
| `NEXT_PUBLIC_PACKAGE_ID` | Yes | Deployed Move package ID |
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_PYTH_PRICE_FEED` | Optional | Pyth oracle price feed ID for SUI |

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- `@mysten/sui.js` + `@mysten/dapp-kit`
- `lightweight-charts` (candlestick chart)
- `recharts` (pool analytics)
- `zustand` (state management)
- Claude API (`claude-haiku-4-5-20251001`) for AI insights

**Smart Contracts**
- Sui Move (Edition 2024.beta)
- Pyth Network oracle (price feeds)

---

## Claude AI Integration

The AI Advisor uses `claude-haiku-4-5-20251001` via two API routes:

**Option Pricing (`/api/claude/option-advisor`)**
```
Input:  type, strike, currentPrice, expiryDays, impliedVol
Output: { profit_probability, breakeven, risk_level, insight, confidence }
```

**LP Pool Advisor (`/api/claude/pool-advisor`)**
```
Input:  utilization, weeklyVolume, apy
Output: { weekly_yield, risk_level, insight, confidence }
```

Both routes fall back to sensible hardcoded data if the API key is missing or unavailable.

---

## Features

- ✅ 5 Move modules (liquidity, options, orderbook, settlement, fees)
- ✅ 7 frontend pages with full UI
- ✅ Real candlestick chart (lightweight-charts)
- ✅ Live order book with depth visualization
- ✅ CALL/PUT toggle with sliding glow animation
- ✅ Claude AI Advisor on every trade
- ✅ Wallet connect UI (Sui dApp Kit)
- ✅ Countdown settlement timer
- ✅ Interactive payout calculator
- ✅ Pool analytics (recharts)
- ✅ Portfolio P&L with position detail drawer
- ✅ Responsive design

---

## License

MIT
