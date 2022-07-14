import * as anchor from '@project-serum/anchor'
import { Fraction, TokenAmount } from '@/types/entity'
import { SplToken } from '@/application/token/type'

export type LiquidityPoolInfo = {
  readonly id: string
  readonly pair: string
  readonly baseMint: string
  readonly quoteMint: string
  readonly lpMint: string
  readonly baseVault: string
  readonly quoteVault: string
  readonly baseDecimals: number
  readonly quoteDecimals: number
  readonly lpDecimals: number
  readonly authority: string
}

export type LiquidityParsedInfo = {
  freeze: boolean
  freeze_liquidity: boolean
  freeze_swap: boolean
  baseReserve: anchor.BN
  quoteReserve: anchor.BN
  lpSupply: anchor.BN
  feeNumerator: anchor.BN
  feeDenominator: anchor.BN
}

export interface HydratedLiquidityInfo extends LiquidityParsedInfo {
  sharePercent: Fraction | undefined
  lpToken: SplToken | undefined
  baseToken: SplToken | undefined
  quoteToken: SplToken | undefined
  userBasePooled: TokenAmount | undefined
  userQuotePooled: TokenAmount | undefined
}
