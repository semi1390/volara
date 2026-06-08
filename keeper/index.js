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

// ─── Get expired options ───────────────────────────────────────────────────────
async function getExpiredOptions() {
  try {
    const now = Math.floor(Date.now() / 1000)

    // Query all OptionPosition objects from the package
    const objects = await client.queryEvents({
      query: { MoveModule: { package: PACKAGE_ID, module: 'options' } },
      limit: 50,
    })

    const expired = []
    for (const event of objects.data) {
      if (event.parsedJson) {
        const data = event.parsedJson
        if (data.expiry && parseInt(data.expiry) <= now && data.id) {
          expired.push({
            id: data.id,
            expiry: parseInt(data.expiry),
            market: data.market || 'SUI/USDC',
          })
        }
      }
    }
    return expired
  } catch (e) {
    log(`Error fetching expired options: ${e.message}`)
    return []
  }
}

// ─── Get SUI price from CoinGecko ─────────────────────────────────────────────
async function getSuiPrice() {
  try {
    const { SuiPriceServiceConnection } = require('@pythnetwork/pyth-sui-js')
    const connection = new SuiPriceServiceConnection(
      'https://hermes-beta.pyth.network',
      { priceFeedRequestConfig: { binary: true } }
    )
    const SUI_USD_FEED = '0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266'
    const feeds = await connection.getLatestPriceFeeds([SUI_USD_FEED])
    if (!feeds || feeds.length === 0) throw new Error('No price feeds returned')
    const feed = feeds[0]
    const price = feed.getPriceNoOlderThan(60) // max 60 seconds old
    if (!price) throw new Error('Price too old')
    const priceValue = parseFloat(price.price) * Math.pow(10, price.expo)
    log(`📡 Pyth SUI/USD price: $${priceValue.toFixed(4)}`)
    return priceValue
  } catch (e) {
    log(`Pyth price failed, falling back to CoinGecko: ${e.message}`)
    // Fallback to CoinGecko
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd')
      const data = await res.json()
      return data.sui?.usd || 0
    } catch (e2) {
      log(`CoinGecko also failed: ${e2.message}`)
      return 0
    }
  }
}

// ─── Settle an option ─────────────────────────────────────────────────────────
async function settleOption(optionId, settlementPrice) {
  try {
    const tx = new Transaction()
    const priceInMist = Math.floor(settlementPrice * 1_000_000_000)

    tx.moveCall({
      target: `${PACKAGE_ID}::settlement::settle_option`,
      arguments: [
        tx.object(SETTLEMENT_REGISTRY_ID),
        tx.object(optionId),
        tx.pure.u64(priceInMist),
      ],
    })

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
    })

    return result.digest
  } catch (e) {
    log(`Settlement failed for ${optionId}: ${e.message}`)
    return null
  }
}

// ─── Main check loop ──────────────────────────────────────────────────────────
async function checkAndSettle() {
  log('🔍 Checking for expired options...')

  const price = await getSuiPrice()
  if (!price) {
    log('⚠️ Could not fetch price, skipping this round')
    return
  }
  log(`💰 Current SUI price: $${price}`)

  const expired = await getExpiredOptions()
  log(`Found ${expired.length} expired option(s)`)

  if (expired.length === 0) return

  for (const option of expired) {
    log(`⚡ Settling option ${option.id} (expired: ${new Date(option.expiry * 1000).toISOString()})`)

    const digest = await settleOption(option.id, price)

    if (digest) {
      const msg = `✅ *Volara Settlement*\n\nOption: \`${option.id.slice(0, 12)}...\`\nMarket: ${option.market}\nSettlement Price: $${price}\nTx: \`${digest}\`\nTime: ${new Date().toISOString()}`
      log(`✅ Settled! Tx: ${digest}`)
      await sendTelegram(msg)
    } else {
      const msg = `❌ *Volara Settlement Failed*\n\nOption: \`${option.id.slice(0, 12)}...\`\nTime: ${new Date().toISOString()}`
      log(`❌ Settlement failed for ${option.id}`)
      await sendTelegram(msg)
    }

    // Small delay between settlements
    await new Promise(r => setTimeout(r, 2000))
  }
}

// ─── Start keeper ─────────────────────────────────────────────────────────────
async function start() {
  log('🚀 Volara Keeper Bot starting...')
  log(`📦 Package: ${PACKAGE_ID}`)
  log(`⏱️  Check interval: ${CHECK_INTERVAL_MS / 1000}s`)

  await sendTelegram('🚀 *Volara Keeper Bot Started*\nMonitoring expired options on Sui Testnet...')

  // Run immediately on start
  await checkAndSettle()

  // Then run every 60 seconds
  setInterval(checkAndSettle, CHECK_INTERVAL_MS)
}

start().catch(e => {
  log(`Fatal error: ${e.message}`)
  process.exit(1)
})
