import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit'

export interface TxRecord {
  digest: string
  type: string
  amount: number
  timestamp: string
}

export function useTransactionHistory() {
  const account = useCurrentAccount()

  const { data, isLoading } = useSuiClientQuery(
    'queryTransactionBlocks',
    {
      filter: { FromAddress: account?.address ?? '' },
      options: {
        showEffects: true,
        showInput: true,
        showBalanceChanges: true,
      },
      limit: 20,
      order: 'descending',
    },
    { enabled: !!account?.address }
  )

  const transactions: TxRecord[] = (data?.data ?? []).map((tx) => {
    const balanceChange = tx.balanceChanges?.find(
      b => b.owner && 'AddressOwner' in b.owner &&
      (b.owner as any).AddressOwner === account?.address
    )
    const amount = parseInt(balanceChange?.amount ?? '0') / 1_000_000_000
    const timestamp = tx.timestampMs
      ? new Date(parseInt(tx.timestampMs)).toLocaleString()
      : 'Unknown'

    // Try to get the Move function name
    const txData = tx.transaction?.data as any
    const moveCall = txData?.transaction?.transactions?.find(
      (t: any) => t.MoveCall
    )?.MoveCall
    const fnName = moveCall?.function ?? 'Transaction'

    return {
      digest: tx.digest,
      type: fnName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      amount,
      timestamp,
    }
  })

  return { transactions, isLoading }
}