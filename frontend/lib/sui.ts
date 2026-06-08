import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'

const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet') || 'testnet'
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0'

export const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) })

export async function getSuiBalance(address: string): Promise<number> {
  try {
    const balance = await suiClient.getBalance({ owner: address })
    return parseInt(balance.totalBalance) / 1_000_000_000
  } catch {
    return 0
  }
}

export function buildDepositTx(poolObjectId: string, amount: number): TransactionBlock {
  const tx = new TransactionBlock()
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)])
  tx.moveCall({
    target: `${PACKAGE_ID}::liquidity_pool::deposit`,
    arguments: [tx.object(poolObjectId), coin],
  })
  return tx
}

export function buildWithdrawTx(poolObjectId: string, shares: number): TransactionBlock {
  const tx = new TransactionBlock()
  tx.moveCall({
    target: `${PACKAGE_ID}::liquidity_pool::withdraw`,
    arguments: [tx.object(poolObjectId), tx.pure(shares)],
  })
  return tx
}

export function buildBuyOptionTx(
  poolObjectId: string,
  optionType: number,
  strikePrice: number,
  expiryTimestamp: number,
  quantity: number,
  market: string,
  premiumAmount: number
): TransactionBlock {
  const tx = new TransactionBlock()
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure(premiumAmount)])
  tx.moveCall({
    target: `${PACKAGE_ID}::options::buy_option`,
    arguments: [
      tx.object(poolObjectId),
      tx.pure(optionType),
      tx.pure(strikePrice),
      tx.pure(expiryTimestamp),
      tx.pure(quantity),
      tx.pure(Array.from(new TextEncoder().encode(market))),
      paymentCoin,
    ],
  })
  return tx
}

export function buildSettleOptionTx(
  registryObjectId: string,
  poolObjectId: string,
  optionObjectId: string,
  settlementPrice: number,
  currentTimestamp: number
): TransactionBlock {
  const tx = new TransactionBlock()
  tx.moveCall({
    target: `${PACKAGE_ID}::settlement::settle_option`,
    arguments: [
      tx.object(registryObjectId),
      tx.object(poolObjectId),
      tx.object(optionObjectId),
      tx.pure(settlementPrice),
      tx.pure(currentTimestamp),
    ],
  })
  return tx
}

export { PACKAGE_ID, NETWORK }
