import useWallet from '@/application/wallet/useWallet'
import { useMemo } from 'react'

import useToken from '../useToken'

/**
 * a feature hook
 * base on user's token list settings, load corresponding tokens
 */
export default function useAutoUpdateSelectableTokens() {
  const verboseTokens = useToken((s) => s.verboseTokens)
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const sortTokens = useToken((s) => s.sortTokens)
  const balances = useWallet((s) => s.balances)

  // only user opened token list
  const settingsFiltedTokens = useMemo(() => {
    const activeTokenListNames = Object.entries(tokenListSettings)
      .filter(([, setting]) => setting.isOn)
      .map(([name]) => name)
    return [...verboseTokens].filter((token) => {
      return activeTokenListNames.some((tokenListName) =>
        tokenListSettings[tokenListName]?.mints?.has(String(token.mint))
      )
    })
  }, [verboseTokens, tokenListSettings])

  // have sorted
  const sortedTokens = useMemo(() => sortTokens(settingsFiltedTokens), [settingsFiltedTokens, sortTokens, balances])

  useToken.setState({
    allSelectableTokens: sortedTokens
  })
}
