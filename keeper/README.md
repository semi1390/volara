# Volara Keeper Bot

Monitors expired options on Sui Testnet and triggers settlement automatically.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy env file:
```bash
cp .env.example .env
```

3. Fill in your `.env`:
- `KEEPER_PRIVATE_KEY` — base64 private key of keeper wallet (needs some SUI for gas)
- `TELEGRAM_BOT_TOKEN` — optional, for settlement notifications
- `TELEGRAM_CHAT_ID` — optional, your Telegram chat ID

## Run

```bash
npm start
```

## How it works

- Checks every 60 seconds for expired options
- Fetches current SUI price from CoinGecko
- Calls `settlement::settle_option` on-chain for each expired option
- Sends Telegram notification on settlement
- Logs all activity to `keeper.log`
