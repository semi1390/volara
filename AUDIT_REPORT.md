# Volara Protocol — Full Security Audit Report
## Version 1.0 | June 2026 | Sui Testnet

---

## Executive Summary

Volara is a decentralized options trading protocol built on Sui blockchain. This report documents the full security audit conducted prior to hackathon submission, identifying all vulnerabilities found, fixes applied, and known limitations before mainnet deployment.

**Status:** Production-quality testnet prototype
**Security:** Security-reviewed testnet implementation

| Category | Notes |
|----------|-------|
| Smart Contract Security | Critical issues fixed, economic caps added |
| Oracle Security | Pyth only, staleness checks, confidence validation |
| Keeper Reliability | Duplicate protection, fail-closed, health checks |
| Frontend Integrity | Dynamic pricing, utilization warnings, on-chain status checks |
| Economic Design | Utilization cap added, insurance fund on roadmap |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                Frontend (Next.js 14)                 │
│  Landing │ Markets │ Trade │ Liquidity │ Portfolio   │
│  Settlement │ AI Insights                            │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌───▼─────┐
   │  Sui    │   │  Claude   │  │CoinGecko│
   │Testnet  │   │   API     │  │ (UI only│
   │(on-chain│   │(Volara AI)│  │no settle│
   └────┬────┘   └───────────┘  └─────────┘
        │
   ┌────▼──────────────────────────┐
   │     Move Smart Contracts       │
   │  liquidity_pool  │  options   │
   │  settlement      │  fees      │
   │  order_book                   │
   └───────────────────────────────┘
        │
   ┌────▼────┐      ┌─────────────┐
   │  Pyth   │      │  Keeper Bot │
   │ Oracle  │◄─────│  (Railway)  │
   │(prices) │      │  60s loops  │
   └─────────┘      └─────────────┘
```

---

## Deployed Contracts (Sui Testnet — 3rd Deploy)

| Contract | Object ID |
|----------|-----------|
| **Package** | `0xa59e822ec1a3350add1a32f5967289624f2a693d4265a610958413c7af5c5495` |
| **LiquidityPool** | `0x21d2c428375c91c987acc76d727eed920af6e0d82e6c118c3138f6d80bc262b9` |
| **SettlementRegistry** | `0xe0cfc0130626ddea4d7b06cb18071a5ba65c00a0d72f2e7eb042f3b1abba870b` |
| **OrderBook** | `0x244996f7478d8b34efc36fdc126a0e4da194eaed325bbe8dd1f89f100d7f2c6d` |
| **Treasury** | `0x2caf95a14ef2d3f86e52c78466712e23d40c8e3f2b96075d2379cde0f35dce42` |
| **AdminCap** | `0xa9e6f8f7387393190c4ede9248d463168b1e12e1e1e6cd0bd069b55c04e1bcdc` |

**Deployer:** `0x7112f788107395468d7433df01900b155ecc88ee4907db0e56aeaf66b4ad3367`
**Keeper Wallet:** `0x0e3fb0258cb9d09cc81329aeeddb8a32dee425ee66a863909e816c80a4eb9c5c`

---

## Smart Contract Modules

### 1. `options.move`
Handles CALL and PUT option minting, buying, and closing.

**Key functions:**
- `buy_option()` — mints OptionPosition object, collects premium, validates contract_size
- `close_position()` — burns option before expiry (no payout)
- `destroy_option()` — internal burn after settlement

**Security features:**
- ✅ Minimum premium enforced on-chain: `MIN_PREMIUM_MIST = 1_000_000` (0.001 SUI)
- ✅ Contract size validation: min 1, max 10000 — enforced on-chain
- ✅ Contract size stored in OptionPosition object — never trusted from keeper/frontend at settlement
- ✅ Pool pause check before buying
- ✅ Utilization check before accepting new options
- ✅ Owner check on close_position
- ✅ Integer overflow safe (Move by default)
- ✅ Option type validation (CALL=0, PUT=1 only)

### 2. `liquidity_pool.move`
Manages LP deposits, withdrawals, and pool exposure tracking.

**Key functions:**
- `deposit()` — accepts SUI, mints LP shares proportionally
- `withdraw()` — burns shares, returns proportional SUI
- `set_paused()` — admin emergency pause
- `withdraw_fees()` — admin fee extraction
- `check_utilization()` — validates new exposure against cap
- `pay_out()` — internal settlement payout
- `collect_premium()` — internal premium collection

**Security features:**
- ✅ `MAX_UTILIZATION_BPS = 7000` (70% cap)
- ✅ Emergency pause via AdminCap
- ✅ Exposure tracking (total_exposure field)
- ✅ Share-based accounting (no rounding exploits)
- ✅ Zero amount checks
- ✅ Insufficient balance check before payout
- ✅ Pause check on all user functions

### 3. `settlement.move`
Handles option expiry settlement and payout distribution.

**Key functions:**
- `settle_option()` — owner-only settlement
- `keeper_settle()` — permissionless settlement after expiry
- `calculate_payout()` — deterministic payout math including contract_size
- `has_been_settled()` — duplicate check getter

**Security features:**
- ✅ `sui::clock::Clock` — tamper-proof on-chain timestamp
- ✅ `MAX_PRICE_AGE_MS = 300_000` (5 minute price staleness limit)
- ✅ Double settlement protection (on-chain registry check)
- ✅ `keeper_settle()` — permissionless after expiry
- ✅ Option object burned after settlement
- ✅ Settlement fee calculated before payout
- ✅ Invalid price check (price > 0)
- ✅ contract_size read from option object — never passed by keeper

**Settlement math:**
```
CALL payout = max(0, settlement_price - strike) × quantity × contract_size
PUT payout  = max(0, strike - settlement_price) × quantity × contract_size
Net payout  = gross_payout - settlement_fee (0.1%)
```

### 4. `fees.move`
Protocol fee collection and treasury management.

### 5. `order_book.move`
On-chain order placement and matching.

---

## Audit Findings

### 🔴 CRITICAL — All Fixed

**[FIXED] C-01: Fake Timestamp Parameter**
- **Severity:** Critical
- **Fix:** Replaced with `clock: &Clock` — Sui's tamper-proof on-chain clock.
- **Status:** ✅ FIXED

**[FIXED] C-02: Keeper Permission Denied**
- **Severity:** Critical
- **Fix:** Added `keeper_settle()` — permissionless after expiry. Standard keeper pattern.
- **Status:** ✅ FIXED

**[FIXED] C-03: No Minimum Premium Validation**
- **Severity:** Critical
- **Fix:** `MIN_PREMIUM_MIST = 1_000_000` (0.001 SUI) enforced in `buy_option()`.
- **Status:** ✅ FIXED

**[FIXED] C-04: No Pool Utilization Cap**
- **Severity:** Critical
- **Fix:** `MAX_UTILIZATION_BPS = 7000` (70%). Reverts with `EPoolUtilizationExceeded`.
- **Status:** ✅ FIXED

**[FIXED] C-05: Contract Size Not Enforced On-Chain**
- **Severity:** Critical
- **Description:** Original contract did not validate or store contract_size. Frontend could pass any value, enabling payout manipulation.
- **Fix:** contract_size added as parameter to `buy_option()`, validated (min 1, max 10000), stored in OptionPosition struct. Payout calculation reads contract_size from the option object — never from keeper or frontend input.
- **Status:** ✅ FIXED

---

### 🟠 IMPORTANT — All Fixed

**[FIXED] I-01: No Price Staleness Check** — ✅ FIXED
**[FIXED] I-02: Double Settlement Not Fully Protected** — ✅ FIXED
**[FIXED] I-03: No Emergency Pause** — ✅ FIXED
**[FIXED] I-04: CoinGecko Settlement Fallback** — ✅ FIXED (fail-closed)
**[FIXED] I-05: Keeper Duplicate Settlement** — ✅ FIXED

---

### 🟡 NICE TO HAVE — Acknowledged, Roadmap

**[ROADMAP] N-01: Frontend-Only Pricing** — V1.1 on-chain pricing oracle
**[ROADMAP] N-02: No Insurance Fund** — V1.1 5% of fees to reserve
**[ROADMAP] N-03: Static IV** — V2.0 dynamic IV from Pyth
**[ROADMAP] N-04: No LP Hedging** — V2.0 delta hedging vaults

---

## Keeper Bot Security

**Deployment:** Railway (24/7) | **Check interval:** 60 seconds | **Oracle:** Pyth only

- ✅ Fail closed — pauses if Pyth unavailable
- ✅ Confidence interval validation (rejects if >2% spread)
- ✅ Price staleness check (max 60 seconds)
- ✅ Duplicate settlement protection
- ✅ contract_size read from option object on-chain
- ✅ Passes `Clock` object — tamper-proof timestamp
- ✅ Health check every 10 minutes
- ✅ Telegram notifications on settlement and failures

---

## Trust Boundary Analysis

| Actor | What they control | What they cannot do |
|-------|-------------------|---------------------|
| **User** | Buy/close own options | Settle others' options before expiry |
| **Keeper** | Trigger settlement after expiry | Change settlement price, double settle |
| **Admin** | Pause pool, withdraw fees | Steal LP funds, change option terms |
| **LP** | Deposit/withdraw liquidity | Affect individual option outcomes |
| **Pyth** | Settlement price source | Bypassed if confidence too wide |

---

## Honest Hackathon Assessment

**What works completely:**
- Full on-chain options with real Sui objects
- Real LP pool with real SUI deposits
- Automated settlement via keeper bot
- Pyth oracle for manipulation-resistant prices
- AI-assisted trade analysis
- Contract size enforced and stored on-chain

**What is simplified for testnet:**
- Premium pricing is frontend-calculated (minimum floor enforced on-chain)
- IV is static per market (dynamic in V2.0)
- No insurance fund (V1.1 roadmap)
- No LP delta hedging (V2.0 roadmap)
- Contract sizes reduced for testnet demo (SUI: 5x vs mainnet 100x)

**Why Sui specifically:**
Each option IS a native Move object in your wallet — not an account balance mapping. This enables transferable positions, object-native ownership, parallel settlement, and composability with other Sui protocols.

---

*Audit conducted by Volara team | June 2026*
*GitHub: https://github.com/semi1390/volara*
*Live: https://volara-gold.vercel.app*