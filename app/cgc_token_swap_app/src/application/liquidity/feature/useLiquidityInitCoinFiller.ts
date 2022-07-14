import { useEffect } from 'react'
import useToken from '@/application/token/useToken'
import { CHICKSMint, SHARDSMint } from '@/application/token/utils/wellknownToken.config'
import useLiquidity from '../useLiquidity'
import toPubString from '@/functions/format/toMintString'

export default function useLiquidityInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  useEffect(() => {
    setTimeout(() => {
      const { coin1, coin2 } = useLiquidity.getState()
      if (!coin1 && toPubString(coin2?.mint) !== toPubString(CHICKSMint)) {
        useLiquidity.setState({ coin1: getToken(CHICKSMint) })
      }
      if (!coin2 && toPubString(coin1?.mint) !== toPubString(SHARDSMint)) {
        useLiquidity.setState({ coin2: getToken(SHARDSMint) })
      }
    })
  }, [getToken])
}
