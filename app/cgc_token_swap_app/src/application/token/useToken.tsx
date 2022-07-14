import create from 'zustand'
import { HexAddress, PublicKeyish, SrcAddress } from '@/types/constants'
import { LpToken, SplToken, TokenJson } from './type'
import { isQuantumSOLVersionSOL, QuantumSOLToken } from './utils/quantumSOL'
import { Price } from '@/types/entity'
import useWallet from '@/application/wallet/useWallet'

export type TokenStore = {
  tokenJsonInfos: Record<HexAddress, TokenJson>
  // has QuantumSOL
  lpTokens: Record<HexAddress, LpToken>

  // has QuantumSOL
  tokens: Record<HexAddress, SplToken | QuantumSOLToken>

  pureTokens: Record<HexAddress, SplToken>
  // has QuantumSOLVersionSOL and QuantumSOLVersionWSOL
  verboseTokens: (SplToken | QuantumSOLToken)[]

  // has QuantumSOL
  // support both spl and lp
  /** exact mode: 'so111111112' will be QSOL-WSOL */
  /** can only get token in tokenList */
  getToken(
    mint: PublicKeyish | undefined,
    options?: { /* use WSOL instead of isQuantumSOLVersionWSOL */ exact?: boolean }
  ): SplToken | undefined
  /**  noQuantumSOL*/
  /** can only get token in tokenList */
  getPureToken(mint: PublicKeyish | undefined): SplToken | undefined

  /** can only get token in tokenList */
  getLpToken(mint: PublicKeyish | undefined): LpToken | undefined

  toUrlMint(token: SplToken | undefined): string

  isLpToken(mint: PublicKeyish | undefined): boolean

  sortTokens(tokens: SplToken[]): SplToken[]
  /** it does't contain lp tokens' price  */
  tokenPrices: Record<HexAddress, Price>
  allSelectableTokens: SplToken[]
  tokenListSettings: {
    [N in SupportedTokenListSettingName]: {
      mints?: Set<HexAddress> // TODO
      disableUserConfig?: boolean
      isOn: boolean
      icon?: SrcAddress
    }
  }
  refreshTokenCount: number
  refreshTokenPrice(): void
}

export type SupportedTokenListSettingName = 'CGC Token List' // actually  official
export const CGC_MAINNET_TOKEN_LIST_NAME = 'CGC Token List'

/** zustand store hooks */
export const useToken = create<TokenStore>((set, get) => ({
  availableTokenLists: [],
  tokenJsonInfos: {},
  // lpToken have not SOL, no need pure and verbose
  lpTokens: {},
  tokens: {},
  pureTokens: {},
  verboseTokens: [],
  getToken: () => undefined,
  getLpToken: () => undefined,
  getPureToken: () => undefined,
  isLpToken: () => false,
  toUrlMint: (token: SplToken | undefined) => String(token?.mint ?? ''),
  sortTokens(tokens: SplToken[]) {
    const { pureBalances } = useWallet.getState()

    const notInWhiteListToken = Object.values(tokens).filter((token) => !isQuantumSOLVersionSOL(token))
    return [
      ...notInWhiteListToken
        .filter((token) => pureBalances[String(token.mint)])
        .sort((tokenA, tokenB) => {
          const balanceA = pureBalances[String(tokenA.mint)].raw
          const balanceB = pureBalances[String(tokenB.mint)].raw
          return balanceA.lte(balanceB) ? 1 : -1
        }),
      ...notInWhiteListToken.filter((token) => !pureBalances[String(token.mint)])
    ]
  },
  tokenPrices: {},
  allSelectableTokens: [],
  tokenListSettings: {
    [CGC_MAINNET_TOKEN_LIST_NAME]: {
      disableUserConfig: true,
      isOn: true
    }
  },

  refreshTokenCount: 0,
  refreshTokenPrice() {
    set((s) => ({ refreshTokenCount: s.refreshTokenCount + 1 }))
  }
}))
export default useToken
