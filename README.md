<div align="center">
  <img src="https://volara-gold.vercel.app/favicon.svg" width="64" height="64" />
  
  # Volara
  ### Decentralized Options Trading on Sui
  
  **Hedge smarter. Trade better.**
  
  [![Live Demo](https://img.shields.io/badge/Live%20Demo-volara--gold.vercel.app-6366f1?style=for-the-badge)](https://volara-gold.vercel.app)
  [![Sui Testnet](https://img.shields.io/badge/Sui-Testnet-4DA2FF?style=for-the-badge)](https://suiscan.xyz/testnet/package/0xa59e822ec1a3350add1a32f5967289624f2a693d4265a610958413c7af5c5495)
  [![Built with Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)](https://nextjs.org)
</div>

---

## What is Volara?

Volara is the first native options protocol on Sui. Users can buy CALL and PUT options on Sui ecosystem tokens — SUI, DEEP, and CETUS — with each position landing in their wallet as a real Move object, not a balance in a mapping.

- **AI-powered analysis** — real-time probability estimates, breakeven calculations, and risk summaries before every trade
- **Automated settlement** — options settle at expiry via Pyth Network oracle, no manual triggers, no admin keys
- **Liquidity pool** — LPs deposit SUI, earn 100% of premiums, protected by a 70% utilization cap enforced on-chain
- **Keeper bot** — runs every 5 minutes on Railway, hits the permissionless settle function at expiry

---

## Live Demo

**→ [https://volara-gold.vercel.app](https://volara-gold.vercel.app)**

Connect your Slush wallet on Sui Testnet to trade live options on-chain.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Next.js 14)               │
│  Landing │ Markets │ Trade │ Liquidity │ Portfolio   │
│  Settlement │ AI Insights                            │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌───▼──────┐
   │  Sui    │   │  Claude   │  │  Pyth    │
   │Testnet  │   │    AI     │  │ Network  │
   │(on-chain│   │ (analysis)│  │(oracle)  │
   └────┬────┘   └───────────┘  └──────────┘
        │
   ┌────▼──────────────────────────┐
   │     Move Smart Contracts      │
   │  liquidity_pool  │  options   │
   │  settlement      │  fees      │
   │  order_book                   │
   └───────────────────────────────┘
        │
   ┌────▼──────┐
   │  Keeper   │
   │  Bot on   │
   │  Railway  │
   └───────────┘
```

---

## Smart Contracts (Sui Testnet — 3rd Deploy)

| Contract | Object ID |
|----------|-----------|
| **Package** | `0xa59e822ec1a3350add1a32f5967289624f2a693d4265a610958413c7af5c5495` |
| **LiquidityPool** | `0x21d2c428375c91c987acc76d727eed920af6e0d82e6c118c3138f6d80bc262b9` |
| **SettlementRegistry** | `0xe0cfc0130626ddea4d7b06cb18071a5ba65c00a0d72f2e7eb042f3b1abba870b` |
| **OrderBook** | `0x244996f7478d8b34efc36fdc126a0e4da194eaed325bbe8dd1f89f100d7f2c6d` |
| **Treasury** | `0x2caf95a14ef2d3f86e52c78466712e23d40c8e3f2b96075d2379cde0f35dce42` |
| **AdminCap** | `0xa9e6f8f7387393190c4ede9248d463168b1e12e1e1e6cd0bd069b55c04e1bcdc` |

### Modules
- `liquidity_pool.move` — LP deposits, withdrawals, share tracking, 70% utilization cap
- `options.move` — CALL/PUT option minting with contract_size enforced on-chain
- `settlement.move` — Automatic cash settlement via Pyth oracle at expiry
- `fees.move` — Protocol fee collection
- `order_book.move` — On-chain order placement

---

## Features

### Trading
- Buy CALL and PUT options on SUI/USDC, DEEP/USDC, CETUS/USDC
- Black-Scholes pricing adjusted for real pool utilization
- TradingView candlestick charts with live market data
- Full options chain — all strikes, bids, asks, and delta
- Contract size enforced on-chain per market

### Volara AI
- Real-time trade analysis powered by Claude
- Probability of profit calculations
- Breakeven price and risk assessment
- Pool liquidity insights for LPs
- Context-aware — reads live pool state and prices

### Liquidity
- Deposit SUI to earn 100% of option premiums
- Real pool balance read directly from chain
- 70% utilization cap enforced on-chain
- No lock period — withdraw anytime

### Portfolio
- Real positions fetched from wallet on-chain
- Transaction history from Sui RPC
- Greeks panel (Delta, Gamma, Theta, Vega)
- One-click position close

### Settlement
- Countdown to next Friday 12:00 UTC settlement
- Interactive payout calculator
- Fully automated — no claim needed
- Settlement history on-chain

### Keeper Bot
- Checks every 5 minutes on Railway
- Fetches price from Pyth Network (fail closed on stale data)
- Triggers permissionless on-chain settlement
- Telegram notifications for settlements and errors
- Reads contract_size from chain — never trusted from external source

---

## Why Sui?

On EVM chains, an options position is a number in a mapping — `balances[address][strikeId] += qty`. On Volara, each option is a native Move object with `has key, store`:

```move
public struct OptionPosition has key, store {
    id: UID,
    option_type: u8,
    strike_price: u64,
    expiry_timestamp: u64,
    quantity: u64,
    contract_size: u64,
    premium_paid: u64,
    market: vector<u8>,
    is_settled: bool,
}
```

This means:
- **Real ownership** — the option lives at your address, verifiable on Suiscan
- **Transferable** — send your position to any wallet natively
- **Composable** — plug into any other Sui protocol
- **Parallel execution** — multiple options settle simultaneously
- **Sub-second finality** — instant settlement at expiry

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Sui Testnet (Move 2024.beta) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | @mysten/dapp-kit, Slush Wallet |
| Charts | TradingView Widget |
| Oracle | Pyth Network (Hermes Beta) |
| AI | Anthropic Claude (claude-haiku-4-5) |
| Deployment | Vercel (frontend), Railway (keeper) |

---

## Running Locally

### Prerequisites
- Node.js 18+
- Sui CLI
- Slush Wallet (browser extension)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Keeper Bot

```bash
cd keeper
npm install
cp env.example .env
# Fill in KEEPER_PRIVATE_KEY and contract IDs
node index.js
```

### Environment Variables

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0xa59e822ec1a3350add1a32f5967289624f2a693d4265a610958413c7af5c5495
NEXT_PUBLIC_LIQUIDITY_POOL_ID=0x21d2c428375c91c987acc76d727eed920af6e0d82e6c118c3138f6d80bc262b9
NEXT_PUBLIC_SETTLEMENT_REGISTRY_ID=0xe0cfc0130626ddea4d7b06cb18071a5ba65c00a0d72f2e7eb042f3b1abba870b
NEXT_PUBLIC_ORDER_BOOK_ID=0x244996f7478d8b34efc36fdc126a0e4da194eaed325bbe8dd1f89f100d7f2c6d
NEXT_PUBLIC_TREASURY_ID=0x2caf95a14ef2d3f86e52c78466712e23d40c8e3f2b96075d2379cde0f35dce42
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Roadmap

- [x] Core options protocol on Sui Testnet
- [x] AI-powered trade analysis
- [x] TradingView charts
- [x] Options chain view
- [x] Automated keeper bot
- [x] Pyth oracle integration
- [x] Contract size enforced on-chain
- [x] Security audit report
- [ ] Mainnet deployment
- [ ] More markets (WAL, NAVX, NS)
- [ ] Dynamic IV from Pyth
- [ ] Insurance fund
- [ ] WebSocket real-time updates

---

## Sui Overflow 2026

Built for **Sui Overflow 2026** hackathon.

**Track:** DeFi & Payments

**Key innovations:**
1. First options protocol native to Sui
2. Each option is a real Move object — not a synthetic balance
3. Automated keeper with Pyth oracle — fully permissionless settlement
4. AI-powered options analysis with live pool context

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built on Sui · Sui Overflow 2026

  <a href="https://volara-gold.vercel.app">Live Demo</a> ·
  <a href="https://github.com/semi1390/volara">GitHub</a> ·
  <a href="https://suiscan.xyz/testnet/package/0xa59e822ec1a3350add1a32f5967289624f2a693d4265a610958413c7af5c5495">Suiscan</a>
</div>