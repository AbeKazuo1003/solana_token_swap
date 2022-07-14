import create from 'zustand'
import { SplToken } from '../token/type'
import { HydratedLiquidityInfo, LiquidityParsedInfo, LiquidityPoolInfo } from '@/application/liquidity/type'
import { PublicKeyish } from '@/types/constants'
import { toDataMint } from '@/application/token/utils/quantumSOL'

export type LiquidityStore = {
  /********************** caches (at least includes exhibition's data) **********************/
  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  poolInfos: LiquidityPoolInfo[]

  /********************** main panel (coin pair panel) **********************/
  currentPoolInfo: LiquidityPoolInfo | undefined
  currentPoolParsedInfo: LiquidityParsedInfo | undefined
  currentHydratedInfo: HydratedLiquidityInfo | undefined // auto parse info in {@link useLiquidityAuto}

  findLiquidityInfoByTokenMint: (
    coin1Mint: PublicKeyish | undefined,
    coin2Mint: PublicKeyish | undefined
  ) => Promise<{
    best: LiquidityPoolInfo | undefined
  }>

  ammId: string | undefined

  coin1: SplToken | undefined

  /** with slippage */
  coin1Amount?: string // for coin may be not selected yet, so it can't be TokenAmount
  unslippagedCoin1Amount?: string // for coin may be not selected yet, so it can't be TokenAmount

  coin2: SplToken | undefined

  /** with slippage */
  coin2Amount?: string // for coin may be not selected yet, so it can't be TokenAmount
  unslippagedCoin2Amount?: string // for coin may be not selected yet, so it can't be TokenAmount

  focusSide: 'coin1' | 'coin2' // not reflect ui placement.  maybe coin1 appears below coin2
  isRemoveDialogOpen: boolean
  removeAmount: string
  scrollToInputBox: () => void

  // just for trigger refresh
  refreshCount: number
  refreshLiquidity: () => void
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useLiquidity.setState()` is enough
const useLiquidity = create<LiquidityStore>((set, get) => ({
  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  poolInfos: [],
  currentPoolInfo: undefined,
  currentPoolParsedInfo: undefined,
  currentHydratedInfo: undefined,
  coin1: undefined,
  coin2: undefined,
  findLiquidityInfoByTokenMint: async (
    coin1Mintlike: PublicKeyish | undefined,
    coin2Mintlike: PublicKeyish | undefined
  ) => {
    const coin1Mint = toDataMint(coin1Mintlike)
    const coin2Mint = toDataMint(coin2Mintlike)
    if (!coin1Mint || !coin2Mint) return { best: undefined }
    const mint1 = String(coin1Mint)
    const mint2 = String(coin2Mint)
    const availables = get().poolInfos.filter(
      (info) =>
        (info.baseMint === mint1 && info.quoteMint === mint2) || (info.baseMint === mint2 && info.quoteMint === mint1)
    )
    const best = await (async () => {
      if (availables.length === 0) return undefined
      if (availables.length === 1) return availables[0]
      return undefined
    })()
    return { best }
  },
  ammId: '',
  focusSide: 'coin1',
  isRemoveDialogOpen: false,
  removeAmount: '',
  scrollToInputBox: () => {},
  refreshCount: 0,
  refreshLiquidity: () => {
    // will auto refresh wallet

    // refresh sdk parsed
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))

export default useLiquidity
