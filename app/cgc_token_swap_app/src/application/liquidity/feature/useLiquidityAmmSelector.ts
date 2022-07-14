import { useEffect } from 'react'
import useToken from '@/application/token/useToken'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useLiquidity from '../useLiquidity'

/** coin1 coin2 ammId */
export default function useLiquidityAmmSelector() {
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const ammId = useLiquidity((s) => s.ammId)
  const currentPoolInfo = useLiquidity((s) => s.currentPoolInfo)

  /** update `coin1` and `coin2` (to match `ammId`) */
  useEffect(() => {
    if (!ammId) return
    const { coin1, coin2, poolInfos } = useLiquidity.getState()
    const targetInfo = poolInfos.find((info) => info.id === ammId)
    // current is right, no need to sync again
    if (isMintEqual(coin1?.mint, targetInfo?.baseMint) && isMintEqual(coin2?.mint, targetInfo?.quoteMint)) return
    if (isMintEqual(coin1?.mint, targetInfo?.quoteMint) && isMintEqual(coin2?.mint, targetInfo?.baseMint)) return

    const { getToken } = useToken.getState()
    const baseCoin = getToken(poolInfos.find((i) => i.id === ammId)?.baseMint)
    const quoteCoin = getToken(poolInfos.find((i) => i.id === ammId)?.quoteMint)

    useLiquidity.setState({
      coin1: baseCoin,
      coin2: quoteCoin
    })
  }, [ammId])

  /** update `ammId` (to match `coin1` and `coin2`) */
  useAsyncEffect(async () => {
    const { findLiquidityInfoByTokenMint, ammId } = useLiquidity.getState()

    const computeResult = await findLiquidityInfoByTokenMint(coin1?.mint, coin2?.mint)
    const resultPool = computeResult.best
    if (resultPool) {
      // current is right, no need to sync again
      if (ammId === resultPool?.id) return

      useLiquidity.setState({
        ammId: resultPool?.id,
        currentPoolInfo: resultPool
      })
    } else {
      // should clear ammId and currentJsonInfo
      useLiquidity.setState({
        ammId: undefined,
        currentPoolInfo: undefined
      })
    }
  }, [coin1, coin2])

  // update `currentJsonInfo` (to match `ammId`)
  useEffect(() => {
    const { poolInfos, currentPoolInfo } = useLiquidity.getState()

    const alreadyMatched = currentPoolInfo?.id === ammId
    if (alreadyMatched) return
    const matchedInfo = poolInfos.find((i) => i.id === ammId)
    useLiquidity.setState({ currentPoolInfo: matchedInfo })
  }, [ammId])

  // update `ammId` (to match `currentJsonInfo`)
  useEffect(() => {
    const { ammId: currentAmmId } = useLiquidity.getState()
    const alreadyMatched = currentPoolInfo?.id === currentAmmId
    if (alreadyMatched) return

    const ammId = currentPoolInfo?.id
    useLiquidity.setState({ ammId })
  }, [currentPoolInfo])
}
