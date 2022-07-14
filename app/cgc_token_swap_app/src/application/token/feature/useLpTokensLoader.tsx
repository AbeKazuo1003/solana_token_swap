import useLiquidity from '@/application/liquidity/useLiquidity'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { useEffect } from 'react'
import { LpToken } from '../type'
import useToken from '../useToken'
import { Token } from '@/types/entity'

export default function useLpTokensLoader() {
  const ammJsonInfos = useLiquidity((s) => s.poolInfos)
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)

  useEffect(() => {
    const lpTokens = listToMap(
      shakeUndifindedItem(
        ammJsonInfos.map((ammJsonInfo) => {
          const baseToken = getToken(ammJsonInfo.baseMint)
          const quoteToken = getToken(ammJsonInfo.quoteMint)
          if (!baseToken || !quoteToken) return // NOTE :  no unknown base/quote lpToken
          return Object.assign(
            new Token(
              ammJsonInfo.lpMint,
              ammJsonInfo.lpDecimals,
              `${baseToken.symbol}-${quoteToken.symbol}`,
              `${baseToken.symbol}-${quoteToken.symbol} LP`
            ),
            {
              isLp: true,
              base: baseToken,
              quote: quoteToken,
              icon: '',
              extensions: {}
            }
          ) as LpToken
        })
      ),
      (t) => toPubString(t.mint)
    )
    useToken.setState({ lpTokens, getLpToken: (mint) => lpTokens[toPubString(mint)] })
  }, [ammJsonInfos, tokens])
}
