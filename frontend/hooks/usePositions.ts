import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit'

export interface OnChainPosition {
  id: string
  type: 'CALL' | 'PUT'
  strike: number
  expiry: number
  premium: number
  quantity: number
  market: string
  isSettled: boolean
}

export function usePositions() {
  const account = useCurrentAccount()

  const { data, isLoading, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address ?? '',
      filter: {
        StructType: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::options::OptionPosition`,
      },
      options: { showContent: true },
    },
    { enabled: !!account?.address }
  )

  const positions: OnChainPosition[] = (data?.data ?? []).map((obj) => {
    const fields = (obj.data?.content as any)?.fields ?? {}
    return {
      id: obj.data?.objectId ?? '',
      type: fields.option_type === 0 ? 'CALL' : 'PUT',
      strike: parseInt(fields.strike_price ?? '0') / 1_000_000_000,
      expiry: parseInt(fields.expiry_timestamp ?? '0'),
      premium: parseInt(fields.premium_paid ?? '0') / 1_000_000_000,
      quantity: parseInt(fields.quantity ?? '0'),
      market: new TextDecoder().decode(new Uint8Array(fields.market ?? [])),
      isSettled: fields.is_settled ?? false,
    }
  })

  return { positions, isLoading, refetch }
}