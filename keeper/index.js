const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client')
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519')
const { Transaction } = require('@mysten/sui/transactions')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

// ─── Config ───────────────────────────────────────────────────────────────────
const PACKAGE_ID = process.env.PACKAGE_ID
const LIQUIDITY_POOL_ID = process.env.LIQUIDITY_POOL_ID
const SETTLEMENT_REGISTRY_ID = process.env.SETTLEMENT_REGISTRY_ID
const PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CHECK_INTERVAL_MS = 60_000 // 60 seconds
const LOG_FILE = path.join(__dirname, 'keeper.log')
const PYTH_ENDPOINT = 'https://hermes-beta.pyth.network'

// Pyth config
const SUI_USD_FEED = '0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266'
const PYTH_ENDPOINT = 'https://hermes.pyth.network'
const MAX_PRICE_AGE_SECONDS = 60 // reject prices older than 60 seconds
const SUI_CLOCK_OBJECT = '0x6' // Sui system clock object

// ─── Sui Client ───────────────────────────────────────────────────────────────
const client = new SuiClient({ url: getFullnodeUrl('testnet') })

let keypair
try {
  keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY)
  log(`✅ Keeper wallet: ${keypair.getPublicKey().toSuiAddress()}`)
} catch (e) {
  log(`❌ Invalid private key: ${e.message}`)
  process.exit(1)
}

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
async function sendTelegram(msg) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
    })
    const data = await res.json()
    if (!data.ok) log(`Telegram error: ${JSON.stringify(data)}`)
  } catch (e) {
    log(`Telegram failed: ${e.message}`)
  }
}

// ─── Get SUI price from Pyth ONLY ─────────────────────────────────────────────
// NO CoinGecko fallback — if Pyth fails, we pause settlement
// This prevents centralized price manipulation at settlement time
async function getSuiPrice() {
  try {
    const SUI_USD_FEED = '0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266'
   // For Sui Testnet use hermes-beta, for mainnet use hermes
const url = `https://hermes-beta.pyth.network/v2/updates/price/latest?ids[]=${SUI_USD_FEED}&parsed=true`

const res = await fetch(url, {
  method: 'GET',
  headers: { accept: 'application/json' }
})
    
    const data = await res.json()
    const parsed = data.parsed?.[0]
    if (!parsed) throw new Error('No price data in Pyth response')

    const price = parsed.price
    const priceValue = parseFloat(price.price) * Math.pow(10, price.expo)
    const confidence = parseFloat(price.conf) * Math.pow(10, price.expo)
    const confidencePct = (confidence / priceValue) * 100

    // Check price age
    const priceAgeMs = Date.now() - (parsed.price.publish_time * 1000)
    if (priceAgeMs > MAX_PRICE_AGE_SECONDS * 1000) {
      throw new Error(`Price too stale: ${(priceAgeMs/1000).toFixed(0)}s old`)
    }

    // Check confidence interval
    if (confidencePct > 2) {
      throw new Error(`Confidence too wide: ${confidencePct.toFixed(2)}%`)
    }

    log(`📡 Pyth SUI/USD: $${priceValue.toFixed(4)} (confidence: ±${confidencePct.toFixed(3)}%, age: ${(priceAgeMs/1000).toFixed(0)}s)`)
    return { price: priceValue, timestampMs: Date.now() }

  } catch (e) {
    log(`❌ Pyth oracle failed — settlement PAUSED: ${e.message}`)
    await sendTelegram(`🚨 *Volara Keeper — Oracle Failure*\n\nPyth price fetch failed:\n\`${e.message}\`\n\nSettlement paused this round. Will retry in 60s.`)
    return null
  }
}

// ─── Check if already settled ─────────────────────────────────────────────────
async function hasBeenSettled(optionId) {
  try {
    // Check if option ID exists in the settlement registry
    const result = await client.devInspectTransactionBlock({
      transactionBlock: (() => {
        const tx = new Transaction()
        tx.moveCall({
          target: `${PACKAGE_ID}::settlement::has_been_settled`,
          arguments: [
            tx.object(SETTLEMENT_REGISTRY_ID),
            tx.pure.id(optionId),
          ],
        })
        return tx
      })(),
      sender: keypair.getPublicKey().toSuiAddress(),
    })
    // If the call returns true, already settled
    const returnValues = result?.results?.[0]?.returnValues
    if (returnValues && returnValues[0]) {
      const settled = returnValues[0][0][0] === 1
      return settled
    }
    return false
  } catch (e) {
    log(`Could not check settlement status for ${optionId}: ${e.message}`)
    return false // assume not settled if check fails
  }
}

// ─── Get expired options ───────────────────────────────────────────────────────
async function getExpiredOptions() {
  try {
    const now = Math.floor(Date.now() / 1000)

    const objects = await client.queryEvents({
      query: { MoveModule: { package: PACKAGE_ID, module: 'options' } },
      limit: 50,
    })

    const expired = []
    for (const event of objects.data) {
      if (event.parsedJson) {
        const data = event.parsedJson
        if (data.expiry_timestamp && parseInt(data.expiry_timestamp) <= now && data.option_id) {
          expired.push({
            id: data.option_id,
            expiry: parseInt(data.expiry_timestamp),
            market: data.market ? Buffer.from(data.market).toString() : 'SUI/USDC',
          })
        }
      }
    }

    log(`Found ${expired.length} potentially expired option(s)`)
    return expired
  } catch (e) {
    log(`Error fetching expired options: ${e.message}`)
    return []
  }
}

// ─── Settle an option using keeper_settle ─────────────────────────────────────
// Uses keeper_settle (permissionless) instead of settle_option (owner only)
// Also passes Clock object for tamper-proof timestamp
async function settleOption(optionId, settlementPrice, priceTimestampMs) {
  try {
    // Check duplicate settlement FIRST
    const alreadySettled = await hasBeenSettled(optionId)
    if (alreadySettled) {
      log(`⚠️ Option ${optionId.slice(0, 12)}... already settled — skipping`)
      return null
    }

    const tx = new Transaction()
    const priceInMist = Math.floor(settlementPrice * 1_000_000_000)

    // Use keeper_settle — permissionless, anyone can call after expiry
    // Passes Clock object for on-chain timestamp validation
    tx.moveCall({
      target: `${PACKAGE_ID}::settlement::keeper_settle`,
      arguments: [
        tx.object(SETTLEMENT_REGISTRY_ID),
        tx.object(LIQUIDITY_POOL_ID),
        tx.object(optionId),
        tx.pure.u64(priceInMist),
        tx.pure.u64(priceTimestampMs),
        tx.object(SUI_CLOCK_OBJECT), // tamper-proof clock
      ],
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    })

    if (result.effects?.status?.status === 'success') {
      return result.digest
    } else {
      throw new Error(`Transaction failed: ${JSON.stringify(result.effects?.status)}`)
    }

  } catch (e) {
    log(`Settlement failed for ${optionId.slice(0, 12)}...: ${e.message}`)
    return null
  }
}

// ─── Main check loop ──────────────────────────────────────────────────────────
async function checkAndSettle() {
  log('🔍 Checking for expired options...')

  // STEP 1: Get price from Pyth ONLY — fail closed if unavailable
  const priceData = await getSuiPrice()
  if (!priceData) {
    log('⏸️ Skipping settlement round — oracle unavailable')
    return
  }

  const { price, timestampMs } = priceData
  log(`💰 Settlement price: $${price.toFixed(4)}`)

  // STEP 2: Get expired options
  const expired = await getExpiredOptions()
  if (expired.length === 0) {
    log('✅ No expired options to settle')
    return
  }

  // STEP 3: Settle each with duplicate protection
  let settled = 0
  let skipped = 0
  let failed = 0

  for (const option of expired) {
    log(`⚡ Processing option ${option.id.slice(0, 12)}... (expired: ${new Date(option.expiry * 1000).toISOString()})`)

    const digest = await settleOption(option.id, price, timestampMs)

    if (digest === null && await hasBeenSettled(option.id)) {
      skipped++
    } else if (digest) {
      settled++
      const msg = `✅ *Volara Settlement*\n\nOption: \`${option.id.slice(0, 12)}...\`\nMarket: ${option.market}\nPrice: $${price.toFixed(4)}\nTx: \`${digest}\`\nTime: ${new Date().toISOString()}`
      log(`✅ Settled! Tx: ${digest}`)
      await sendTelegram(msg)
    } else {
      failed++
      log(`❌ Settlement failed for ${option.id.slice(0, 12)}...`)
    }

    // Small delay between settlements
    await new Promise(r => setTimeout(r, 2000))
  }

  log(`📊 Round complete — Settled: ${settled}, Skipped: ${skipped}, Failed: ${failed}`)

  if (settled > 0 || failed > 0) {
    await sendTelegram(`📊 *Volara Keeper Round Complete*\n\n✅ Settled: ${settled}\n⏭️ Skipped: ${skipped}\n❌ Failed: ${failed}\nPrice: $${price.toFixed(4)}`)
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────
async function healthCheck() {
  try {
    const balance = await client.getBalance({ owner: keypair.getPublicKey().toSuiAddress() })
    const suiBalance = parseInt(balance.totalBalance) / 1_000_000_000
    log(`💳 Keeper wallet balance: ${suiBalance.toFixed(4)} SUI`)

    if (suiBalance < 0.1) {
      log('⚠️ LOW BALANCE — keeper may run out of gas soon!')
      await sendTelegram(`⚠️ *Volara Keeper — Low Balance*\n\nBalance: ${suiBalance.toFixed(4)} SUI\nPlease top up keeper wallet!`)
    }
  } catch (e) {
    log(`Health check failed: ${e.message}`)
  }
}

// ─── Start keeper ─────────────────────────────────────────────────────────────
async function start() {
  log('🚀 Volara Keeper Bot v2.0 starting...')
  log(`📦 Package: ${PACKAGE_ID}`)
  log(`🏦 Pool: ${LIQUIDITY_POOL_ID}`)
  log(`📋 Registry: ${SETTLEMENT_REGISTRY_ID}`)
  log(`⏱️  Check interval: ${CHECK_INTERVAL_MS / 1000}s`)
  log(`🔒 Oracle: Pyth only (no CoinGecko fallback — fail closed)`)

  await sendTelegram('🚀 *Volara Keeper v2.0 Started*\n\n✅ Pyth oracle only\n✅ Duplicate protection\n✅ Clock-based settlement\n✅ Confidence interval validation\n\nMonitoring Sui Testnet...')

  // Health check on start
  await healthCheck()

  // Run immediately on start
  await checkAndSettle()

  // Then run every 60 seconds
  setInterval(checkAndSettle, CHECK_INTERVAL_MS)

  // Health check every 10 minutes
  setInterval(healthCheck, 10 * 60 * 1000)
}

start().catch(e => {
  log(`Fatal error: ${e.message}`)
  process.exit(1)
})