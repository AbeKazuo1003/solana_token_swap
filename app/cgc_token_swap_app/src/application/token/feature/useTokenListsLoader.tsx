import { useEffect } from 'react'
import { asyncMapAllSettled } from '@/functions/asyncMap'
import listToMap from '@/functions/format/listToMap'
import MarketTokens from '@/json/tokens.json'
import { SplToken, TokenJson } from '../type'
import useToken, { CGC_MAINNET_TOKEN_LIST_NAME } from '../useToken'
import {
  QuantumSOL,
  QuantumSOLVersionSOL,
  QuantumSOLVersionWSOL,
  SOLUrlMint,
  WSOLMint
} from '@/application/token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'
import { HexAddress, PublicKeyish } from '@/types/constants'
import { Token } from '@/types/entity'
import { objectMap, replaceValue } from '@/functions/objectMethods'
import { WSOL } from '@/functions/sol'

export default function useTokenListsLoader() {
  useEffect(() => {
    loadTokens()
  }, [])
}

async function fetchTokenLists(): Promise<{
  officialMints: string[]
  tokens: TokenJson[]
}> {
  const officialMints: string[] = []
  const tokens: TokenJson[] = []
  // eslint-disable-next-line no-console
  console.info('tokenList start fetching')
  const tokenData = MarketTokens
  await asyncMapAllSettled(tokenData.official, async (raw) => {
    officialMints.push(raw.mint)
    tokens.push(raw)
  })
  // eslint-disable-next-line no-console
  console.info('tokenList end fetching')
  return { officialMints, tokens }
}

export function createSplToken(
  info: Partial<TokenJson> & { mint: HexAddress; decimals: number; icon: string }
): SplToken {
  const { mint, symbol, name = symbol, decimals, icon, ...rest } = info
  return Object.assign(new Token(mint, decimals, symbol, name), { icon: icon, extensions: {}, id: mint }, rest)
}

async function loadTokens() {
  console.log('Start Load Tokens')
  const { officialMints, tokens: allTokens } = await fetchTokenLists()
  useToken.setState((s) => ({
    tokenListSettings: {
      ...s.tokenListSettings,
      [CGC_MAINNET_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[CGC_MAINNET_TOKEN_LIST_NAME],
        mints: new Set(officialMints)
      }
    }
  }))
  const startWithSymbol = (s: string) => !/^[a-zA-Z]/.test(s)
  const splTokenJsonInfos = listToMap(
    allTokens.sort((a, b) => {
      const aPriorityOrder = officialMints.includes(a.mint) ? 1 : 3
      const bPriorityOrder = officialMints.includes(b.mint) ? 1 : 3
      const priorityOrderDiff = aPriorityOrder - bPriorityOrder
      if (priorityOrderDiff === 0) {
        const aStartWithSymbol = startWithSymbol(a.symbol)
        const bStartWithSymbol = startWithSymbol(b.symbol)
        if (aStartWithSymbol && !bStartWithSymbol) return 1
        if (!aStartWithSymbol && bStartWithSymbol) return -1
        return a.symbol.localeCompare(b.symbol)
      } else {
        return priorityOrderDiff
      }
    }),
    (i) => i.mint
  )
  const pureTokens = objectMap(splTokenJsonInfos, (tokenJsonInfo) => createSplToken(tokenJsonInfo))
  const tokens = { ...pureTokens, [toPubString(QuantumSOL.mint)]: QuantumSOL }
  const verboseTokens = [
    QuantumSOLVersionSOL,
    ...Object.values(replaceValue(pureTokens, (v, k) => k === String(WSOL.mint), QuantumSOLVersionWSOL))
  ]

  /** NOTE -  getToken place 1 */
  /** exact mode: 'so111111112' will be QSOL-WSOL 'sol' will be QSOL-SOL */
  function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
    if (String(mint) === SOLUrlMint) {
      return QuantumSOLVersionSOL
    }
    if (String(mint) === String(WSOLMint) && options?.exact) {
      return QuantumSOLVersionWSOL
    }
    return tokens[String(mint)]
  }

  function getPureToken(mint: PublicKeyish | undefined): SplToken | undefined {
    return pureTokens[String(mint)]
  }

  useToken.setState({
    tokenJsonInfos: listToMap(allTokens, (i) => i.mint),
    tokens,
    pureTokens,
    verboseTokens,
    getToken,
    getPureToken
  })
}
