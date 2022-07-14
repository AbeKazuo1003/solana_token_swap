import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { CHICKSMint, SHARDSMint } from '@/application/token/utils/wellknownToken.config'

import { useSwap } from '@/application/swap/useSwap'
import toPubString from '@/functions/format/toMintString'

export default function useSwapInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  useEffect(() => {
    const { coin1, coin2 } = useSwap.getState()
    if (!coin1 && toPubString(coin2?.mint) !== toPubString(CHICKSMint)) {
      useSwap.setState({ coin1: getToken(CHICKSMint) })
    }
    if (!coin2 && toPubString(coin1?.mint) !== toPubString(SHARDSMint)) {
      useSwap.setState({ coin2: getToken(SHARDSMint) })
    }
  }, [getToken])
}
