import '../styles/index.css'
import type { AppProps } from 'next/app'
import NextNProgress from 'nextjs-progressbar'

import { SolanaWalletProviders } from '@/contexts/SolanaWalletProvider'
import useHandleWindowTopError from '@/hooks/useHandleWindowTopError'
import {
  useDeviceInfoSyc,
  useSlippageTolerenceSyncer,
  useSlippageTolerenceValidator
} from '@/application/appSettings/initializationHooks'
import useConnectionInitialization from '@/application/connection/useConnectionInitialization'
import useFreshChainTimeOffset from '@/application/connection/useFreshChainTimeOffset'
import { useSyncWithSolanaWallet } from '@/application/wallet/feature/useSyncWithSolanaWallet'
import { useWalletConnectNotifaction } from '@/application/wallet/feature/useWalletConnectNotifaction'
import { useWalletAccountChangeListeners } from '@/application/wallet/feature/useWalletAccountChangeListeners'
import { POPOVER_STACK_ID } from '@/components/Popover'
import { DRAWER_STACK_ID } from '@/components/Drawer'
import WalletSelectorDialog from '@/components/dialogs/WalletSelectorDialog'
import NotificationSystemStack from '@/components/NotificationSystemStack'
import useTokenAccountsRefresher from '@/application/wallet/feature/useTokenAccountsRefresher'
import useInitBalanceRefresher from '@/application/wallet/feature/useBalanceRefresher'
import useLiquidityInfoLoader from '@/application/liquidity/feature/useLiquidityInfoLoader'
import useProgramInitialization from '@/application/program/feature/useProgramInitialization'
import useTokenListsLoader from '@/application/token/feature/useTokenListsLoader'
import useLpTokensLoader from '@/application/token/feature/useLpTokensLoader'
import { useLpTokenMethodsLoad } from '@/application/token/feature/useLpTokenMethodsLoad'
import useTokenPriceRefresher from '@/application/token/feature/useTokenPriceRefresher'
import useAutoUpdateSelectableTokens from '@/application/token/feature/useAutoUpdateSelectableTokens'
import { useRouter } from 'next/router'

export default function MyApp({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter()
  return (
    <SolanaWalletProviders>
      <ClientInitialization />
      {pathname !== '/' && <ApplicationsInitializations />}
      <div className="app">
        <NextNProgress color="#34ade5" showOnShallow={false} />
        <Component {...pageProps} />

        {/* popup stack */}
        <div id={POPOVER_STACK_ID} className="fixed z-popover inset-0 self-pointer-events-none"></div>
        <div id={DRAWER_STACK_ID} className="fixed z-popover inset-0 self-pointer-events-none"></div>

        {/* Global Components */}
        <WalletSelectorDialog />
        <NotificationSystemStack />
      </div>
    </SolanaWalletProviders>
  )
}

function ClientInitialization() {
  useHandleWindowTopError()
  useDeviceInfoSyc()
  return null
}

function ApplicationsInitializations() {
  useSlippageTolerenceValidator()
  useSlippageTolerenceSyncer()
  /********************** Liquidity **********************/
  useLiquidityInfoLoader()

  /********************** connection **********************/
  useConnectionInitialization()
  useFreshChainTimeOffset()

  /********************** wallet **********************/
  useSyncWithSolanaWallet()
  useWalletConnectNotifaction()
  useTokenAccountsRefresher()
  useInitBalanceRefresher()
  useWalletAccountChangeListeners()

  /********************** program **********************/
  useProgramInitialization()

  /********************** Wallet **********************/
  useAutoUpdateSelectableTokens()
  useTokenListsLoader()
  useLpTokensLoader()
  useLpTokenMethodsLoad()
  useTokenPriceRefresher()

  return null
}
