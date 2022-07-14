import React, { useRef } from 'react'
import { WalletAdapter, WalletReadyState } from '@solana/wallet-adapter-base'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useWallet from '@/application/wallet/useWallet'
import Card from '@/components/Card'
import Icon from '@/components/Icon'
import Row from '@/components/Row'

import Grid from '../Grid'
import ResponsiveDialogDrawer from '../ResponsiveDialogDrawer'

function WalletSelectorPanelItem({
  wallet,
  available: detected,
  onClick
}: {
  wallet: { adapter: WalletAdapter; readyState: WalletReadyState }
  available?: boolean
  onClick?(): void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const { select } = useWallet()
  return (
    <Row
      className={`relative items-center gap-3 m-auto px-6 mobile:px-3 mobile:py-1.5 py-3 w-64 mobile:w-[42vw] h-14  mobile:h-12 frosted-glass frosted-glass-teal rounded-xl mobile:rounded-lg ${
        detected ? 'opacity-100' : 'opacity-40'
      } clickable clickable-filter-effect`}
      // TODO disable status
      onClick={() => {
        select(wallet.adapter.name)
        onClick?.()
      }}
    >
      <Icon className="shrink-0" size={isMobile ? 'md' : 'lg'} iconSrc={wallet.adapter.icon} />
      <div className="mobile:text-sm text-base font-bold text-white">{wallet.adapter.name}</div>
    </Row>
  )
}

export default function WalletSelectorDialog() {
  const isWalletSelectorShown = useAppSettings((s) => s.isWalletSelectorShown)
  const { availableWallets } = useWallet()
  return (
    <ResponsiveDialogDrawer
      placement="from-top"
      open={isWalletSelectorShown}
      onCloseTransitionEnd={() => useAppSettings.setState({ isWalletSelectorShown: false })}
    >
      {({ close }) => <PanelContent close={close} wallets={availableWallets} />}
    </ResponsiveDialogDrawer>
  )
}

function PanelContent({
  close,
  wallets
}: {
  close(): void
  wallets: { adapter: WalletAdapter; readyState: WalletReadyState }[]
}) {
  const installedWallets = wallets
    .filter((w) => w.readyState !== WalletReadyState.Unsupported)
    .filter((w) => w.readyState !== WalletReadyState.NotDetected)

  return (
    <Card
      className="flex flex-col max-h-screen  w-[586px] mobile:w-screen rounded-3xl mobile:rounded-none border-1.5 border-[rgba(171,196,255,0.2)] overflow-hidden bg-cyberpunk-card-bg shadow-cyberpunk-card"
      size="lg"
    >
      <Row className="items-center justify-between px-8 py-8">
        <div className="text-xl font-semibold text-white">Connect your wallet to Catheon Game</div>
        <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
      </Row>

      <Grid
        className={`px-8 py-8 mobile:px-6 gap-x-6 gap-y-3 mobile:gap-2 ${
          installedWallets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        } grow`}
      >
        {installedWallets.map((wallet) => (
          <WalletSelectorPanelItem key={wallet.adapter.name} wallet={wallet} onClick={close} available />
        ))}
      </Grid>
    </Card>
  )
}
