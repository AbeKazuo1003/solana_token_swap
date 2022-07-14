import BN from 'bn.js'

import toFraction from '@/functions/number/toFraction'
import { HexAddress } from '@/types/constants'

import toBN from '@/functions/number/toBN'
import { LpToken, SplToken } from '../../token/type'
import { HydratedLiquidityInfo, LiquidityParsedInfo, LiquidityPoolInfo } from '../type'
import { TokenAmount } from '@/types/entity'

export default function hydrateLiquidityInfo(
  liquidityInfo: LiquidityPoolInfo,
  liquidityParsedInfo: LiquidityParsedInfo,
  additionalTools: {
    getToken: (mint: HexAddress) => SplToken | undefined
    getLpToken: (mint: HexAddress) => LpToken | undefined
    lpBalance: BN | undefined
  }
): HydratedLiquidityInfo {
  const lpToken = additionalTools.getLpToken(String(liquidityInfo.lpMint)) as SplToken | undefined
  const baseToken = additionalTools.getToken(String(liquidityInfo.baseMint))
  const quoteToken = additionalTools.getToken(String(liquidityInfo.quoteMint))
  // lp
  const sharePercent = additionalTools.lpBalance
    ? toFraction(additionalTools.lpBalance).div(toFraction(liquidityParsedInfo.lpSupply))
    : undefined
  const userBasePooled =
    baseToken && sharePercent
      ? new TokenAmount(baseToken, toBN(sharePercent.mul(liquidityParsedInfo.baseReserve)))
      : undefined
  const userQuotePooled =
    quoteToken && sharePercent
      ? new TokenAmount(quoteToken, toBN(sharePercent.mul(liquidityParsedInfo.quoteReserve)))
      : undefined

  return {
    ...liquidityParsedInfo,
    userBasePooled,
    userQuotePooled,
    sharePercent,
    lpToken,
    baseToken,
    quoteToken
  }
}
