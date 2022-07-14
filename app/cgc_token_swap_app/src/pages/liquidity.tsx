import createContextStore from '@/functions/react/createContextStore'
import { createRef, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Button, { ButtonHandle } from '@/components/Button'
import Tabs from '@/components/Tabs'
import Row from '@/components/Row'
import { routeTo } from '@/application/routeTools'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import useWallet from '@/application/wallet/useWallet'
import { SOLDecimals } from '@/application/token/utils/quantumSOL'
import { div, mul } from '@/functions/number/operations'
import { toString } from '@/functions/number/toString'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Tooltip from '@/components/Tooltip'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useLiquidity from '@/application/liquidity/useLiquidity'
import Col from '@/components/Col'
import { twMerge } from 'tailwind-merge'
import formatNumber from '@/functions/format/formatNumber'
import Input from '@/components/Input'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import useLiquidityInitCoinFiller from '@/application/liquidity/feature/useLiquidityInitCoinFiller'
import useLiquidityUrlParser from '@/application/liquidity/feature/useLiquidityUrlParser'
import useLiquidityAmmSelector from '@/application/liquidity/feature/useLiquidityAmmSelector'
import useLiquidityAmountCalculator from '@/application/liquidity/feature/useLiquidityAmountCalculator'
import { NextPage } from 'next'
import useToken from '@/application/token/useToken'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import RefreshCircle from '@/components/RefreshCircle'
import { isMeaningfulNumber } from '@/functions/number/compare'
import toAddLiquidity from '@/application/liquidity/transaction/txAddLiquidity'
import useNotification from '@/application/notification/useNotification'
import Card from '@/components/Card'
import List from '@/components/List'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import { RemoveLiquidityDialog } from '@/components/dialogs/RemoveLiquidityDialog'

const { ContextProvider: LiquidityUIContextProvider, useStore: useLiquidityContextStore } = createContextStore({
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  liquidityButtonComponentRef: createRef<ButtonHandle>()
})

function LiquidityEffect() {
  useLiquidityUrlParser()
  useLiquidityInitCoinFiller()
  useLiquidityAmmSelector()
  useLiquidityAmountCalculator()
  return null
}

const Liquidity: NextPage = () => {
  return (
    <LiquidityUIContextProvider>
      <LiquidityEffect />
      <div
        style={{
          padding:
            'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
          position: 'relative',
          display: 'grid',
          gridTemplate: `
          "d d d" auto
          "a a a" auto
          "b c c" 1fr
          "b c c" 1fr / auto 1fr 1fr`,
          overflow: 'hidden', // establish a BFC
          willChange: 'opacity'
        }}
        className={`w-screen mobile:w-full h-screen mobile:h-full`}
      >
        <main
          // always occupy scrollbar space
          className="PageLayoutContent relative isolate flex-container grid-area-c bg-gradient-to-b from-[#0c0927] to-[#110d36] rounded-tl-3xl mobile:rounded-none p-12 pb-4 pt-5 mobile:py-2 mobile:px-3"
          style={{
            overflowX: 'hidden',
            overflowY: 'scroll'
          }}
        >
          <Row className="mb-12 mobile:mb-2 self-center">
            <Tabs
              currentValue={'Liquidity'}
              values={['Swap', 'Liquidity']}
              onChange={(newTab) => {
                if (newTab === 'Swap') {
                  routeTo('/swap')
                }
              }}
            />
          </Row>
          <LiquidityCard />
          <UserLiquidityExhibition />
        </main>
      </div>
    </LiquidityUIContextProvider>
  )
}
export default Liquidity

function LiquidityCard() {
  const { connected } = useWallet()
  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)
  const {
    coin1,
    coin1Amount,
    unslippagedCoin1Amount,
    coin2,
    coin2Amount,
    unslippagedCoin2Amount,
    focusSide,
    currentPoolInfo,
    currentPoolParsedInfo,
    refreshLiquidity
  } = useLiquidity()

  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)
  const { liquidityButtonComponentRef, coinInputBox1ComponentRef, coinInputBox2ComponentRef } =
    useLiquidityContextStore()
  const hasFoundLiquidityPool = useMemo(() => Boolean(currentPoolInfo), [currentPoolInfo])
  const hasLiquidityParsedInfo = useMemo(() => Boolean(currentPoolParsedInfo), [currentPoolParsedInfo])

  const haveEnoughCoin1 =
    coin1 &&
    checkWalletHasEnoughBalance(
      toTokenAmount(coin1, focusSide === 'coin1' ? coin1Amount : unslippagedCoin1Amount, { alreadyDecimaled: true })
    )
  const haveEnoughCoin2 =
    coin2 &&
    checkWalletHasEnoughBalance(
      toTokenAmount(coin2, focusSide === 'coin2' ? coin2Amount : unslippagedCoin2Amount, { alreadyDecimaled: true })
    )

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useLiquidity.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="w-[min(456px,100%)] self-center cyberpunk-bg-light"
      className="py-8 pt-4 px-6 mobile:py-5"
    >
      <CoinInputBox
        className="mt-5"
        disabled={isApprovePanelShown}
        componentRef={coinInputBox1ComponentRef}
        value={focusSide === 'coin1' ? coin1Amount : unslippagedCoin1Amount}
        haveHalfButton
        haveCoinIcon
        showTokenSelectIcon
        topLeftLabel=""
        onTryToTokenSelect={() => {}}
        onUserInput={(amount) => {
          useLiquidity.setState({ coin1Amount: amount, focusSide: 'coin1' })
        }}
        onEnter={(input) => {
          if (!input) return
          if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
          if (coin2 && coin2Amount) liquidityButtonComponentRef.current?.click?.()
        }}
        token={coin1}
      />
      <div className="relative h-8 my-4">
        <Row className={'absolute h-full items-center transition-all left-1/2 -translate-x-1/2'}>
          <Icon heroIconName="plus" className="p-1 mr-4 mobile:mr-2 text-[#39D0D8]" />
          <FadeIn>
            <LiquidityCardPriceIndicator className="w-max" />
          </FadeIn>
        </Row>
        <Row className="absolute right-0">
          <RefreshCircle
            run={!isApprovePanelShown}
            refreshKey="liquidity/add"
            popPlacement="right-bottom"
            freshFunction={() => {
              if (isApprovePanelShown) return
              refreshLiquidity()
              refreshTokenPrice()
            }}
          />
        </Row>
      </div>
      <CoinInputBox
        componentRef={coinInputBox2ComponentRef}
        disabled={isApprovePanelShown}
        value={focusSide === 'coin2' ? coin2Amount : unslippagedCoin2Amount}
        haveHalfButton
        haveCoinIcon
        showTokenSelectIcon
        topLeftLabel=""
        onTryToTokenSelect={() => {}}
        onEnter={(input) => {
          if (!input) return
          if (!coin1) coinInputBox1ComponentRef.current?.selectToken?.()
          if (coin1 && coin1Amount) liquidityButtonComponentRef.current?.click?.()
        }}
        onUserInput={(amount) => {
          useLiquidity.setState({ coin2Amount: amount, focusSide: 'coin2' })
        }}
        token={coin2}
      />
      <FadeInStable show={hasFoundLiquidityPool}>
        <LiquidityCardInfo className="mt-5" />
      </FadeInStable>
      <Button
        className="block frosted-glass-teal w-full mt-5"
        componentRef={liquidityButtonComponentRef}
        disabled={isApprovePanelShown}
        validators={[
          {
            should: hasFoundLiquidityPool,
            fallbackProps: { children: `Pool not found` }
          },
          {
            should: connected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Wallet'
            }
          },
          {
            should: hasLiquidityParsedInfo,
            fallbackProps: { children: `Pool Info Loading...` }
          },
          {
            should: coin1 && coin2,
            fallbackProps: { children: 'Select a token' }
          },
          {
            should: coin1Amount && isMeaningfulNumber(coin1Amount) && coin2Amount && isMeaningfulNumber(coin2Amount),
            fallbackProps: { children: 'Enter an amount' }
          },
          {
            should: haveEnoughCoin1,
            fallbackProps: { children: `Insufficient ${coin1?.symbol ?? ''} balance` }
          },
          {
            should: haveEnoughCoin2,
            fallbackProps: { children: `Insufficient ${coin2?.symbol ?? ''} balance` }
          },
          {
            should: isMeaningfulNumber(coin1Amount) && isMeaningfulNumber(coin2Amount),
            fallbackProps: { children: 'Enter an amount' }
          }
        ]}
        onClick={() => {
          toAddLiquidity().then(({ allSuccess }) => {
            if (allSuccess) {
              const { logSuccess } = useNotification.getState()
              logSuccess(
                'Success',
                `Add ${toString(coin1Amount)} ${coin1?.symbol} and ${toString(coin2Amount)} ${coin2?.symbol}`
              )
            }
          })
        }}
      >
        Add Liquidity
      </Button>
      <RemainSOLAlert />
    </CyberpunkStyleCard>
  )
}

function RemainSOLAlert() {
  const rawSolBalance = useWallet((s) => s.solBalance)
  const solBalance = div(rawSolBalance, 10 ** SOLDecimals)
  return (
    <FadeIn>
      <Row className="text-sm mt-2 text-[#D8CB39] items-center justify-center">
        SOL balance: {toString(solBalance)}{' '}
      </Row>
    </FadeIn>
  )
}

function LiquidityCardInfo({ className }: { className?: string }) {
  const currentHydratedInfo = useLiquidity((s) => s.currentHydratedInfo)
  const currentPoolInfo = useLiquidity((s) => s.currentPoolInfo)
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const focusSide = useLiquidity((s) => s.focusSide)
  const coin1Amount = useLiquidity((s) => s.coin1Amount)
  const coin2Amount = useLiquidity((s) => s.coin2Amount)
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)

  const isCoin1Base = String(currentPoolInfo?.baseMint) === String(coin1?.mint)

  const coinBase = isCoin1Base ? coin1 : coin2
  const coinQuote = isCoin1Base ? coin2 : coin1

  const pooledBaseTokenAmount = currentHydratedInfo?.baseToken
    ? toTokenAmount(currentHydratedInfo.baseToken, currentHydratedInfo.baseReserve)
    : undefined
  const pooledQuoteTokenAmount = currentHydratedInfo?.quoteToken
    ? toTokenAmount(currentHydratedInfo.quoteToken, currentHydratedInfo.quoteReserve)
    : undefined

  return (
    <Col
      className={twMerge(
        'py-4 px-6 flex-grow ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl items-center',
        className
      )}
    >
      <Col className="w-full">
        <LiquidityCardItem
          fieldName={`Base`}
          fieldValue={focusSide === 'coin1' ? coin1?.symbol ?? 'unknown' : coin2?.symbol ?? 'unknown'}
        />
        <FadeIn>
          {(coin1Amount || coin2Amount) && (
            <LiquidityCardItem
              fieldName={`Max Amount`}
              fieldValue={`${formatNumber(focusSide === 'coin1' ? coin2Amount || '' : coin1Amount ?? '', {
                fractionLength: 'auto'
              })} ${focusSide === 'coin1' ? coin2?.symbol ?? 'unknown' : coin1?.symbol ?? 'unknown'}`}
            />
          )}
        </FadeIn>
        <LiquidityCardItem
          fieldName={`Pool liquidity (${coinBase?.symbol ?? 'unknown'})`}
          fieldValue={
            <div>
              {pooledBaseTokenAmount
                ? `${formatNumber(pooledBaseTokenAmount.toExact())} ${coinBase?.symbol ?? 'unknown'}`
                : '--'}
            </div>
          }
        />
        <LiquidityCardItem
          fieldName={`Pool liquidity (${coinQuote?.symbol ?? 'unknown'})`}
          fieldValue={
            <div>
              {pooledQuoteTokenAmount
                ? `${formatNumber(pooledQuoteTokenAmount.toExact())} ${coinQuote?.symbol ?? 'unknown'}`
                : '--'}
            </div>
          }
        />
        <LiquidityCardItem
          fieldName={`LP supply`}
          fieldValue={
            <Row className="items-center gap-2">
              <div>
                {currentHydratedInfo?.lpToken
                  ? `${formatNumber(
                      toString(toTokenAmount(currentHydratedInfo.lpToken, currentHydratedInfo.lpSupply))
                    )} LP`
                  : '--'}
              </div>
            </Row>
          }
        />
        <LiquidityCardItem
          fieldName="Slippage Tolerance"
          fieldValue={
            <Row className="py-1 px-2 bg-[#141041] rounded-sm text-[#F1F1F2] font-medium text-xs -my-1">
              <Input
                className="w-6"
                value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
                onUserInput={(value) => {
                  const n = div(parseFloat(value), 100)
                  if (n) {
                    useAppSettings.setState({ slippageTolerance: n })
                  }
                }}
              />
              <div className="opacity-50 ml-1">%</div>
            </Row>
          }
        />
      </Col>
    </Col>
  )
}

function LiquidityCardPriceIndicator({ className }: { className?: string }) {
  const [innerReversed, setInnerReversed] = useState(false)
  const currentPoolInfo = useLiquidity((s) => s.currentPoolInfo)
  const currentPoolParsedInfo = useLiquidity((s) => s.currentPoolParsedInfo)
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const isMobile = useAppSettings((s) => s.isMobile)

  const pooledBaseTokenAmount = currentPoolParsedInfo ? currentPoolParsedInfo.baseReserve : undefined
  const pooledQuoteTokenAmount = currentPoolParsedInfo ? currentPoolParsedInfo.quoteReserve : undefined

  const isCoin1Base = String(currentPoolInfo?.baseMint) === String(coin1?.mint)
  const [poolCoin1TokenAmount, poolCoin2TokenAmount] = isCoin1Base
    ? [pooledBaseTokenAmount, pooledQuoteTokenAmount]
    : [pooledQuoteTokenAmount, pooledBaseTokenAmount]

  const price =
    isMeaningfulNumber(poolCoin1TokenAmount) && poolCoin2TokenAmount
      ? div(poolCoin2TokenAmount, poolCoin1TokenAmount)
      : undefined

  const innerPriceLeftCoin = innerReversed ? coin2 : coin1
  const innerPriceRightCoin = innerReversed ? coin1 : coin2

  if (!price) return null
  return (
    <Row className={twMerge('font-medium text-sm text-[#ABC4FF]', className)}>
      {1} {innerPriceLeftCoin?.symbol ?? '--'} ≈{' '}
      {toString(innerReversed ? div(1, price) : price, {
        decimalLength: isMobile ? 'auto 2' : 'auto',
        zeroDecimalNotAuto: true
      })}{' '}
      {innerPriceRightCoin?.symbol ?? '--'}
      <div className="ml-2 clickable" onClick={() => setInnerReversed((b) => !b)}>
        ⇋
      </div>
    </Row>
  )
}

function LiquidityCardItem({
  className,
  fieldName,
  fieldValue,
  tooltipContent,
  debugForceOpen
}: {
  className?: string
  fieldName?: string
  fieldValue?: ReactNode
  tooltipContent?: ReactNode
  /** !! only use it in debug */
  debugForceOpen?: boolean
}) {
  return (
    <Row className={twMerge('w-full justify-between my-1.5', className)}>
      <Row className="items-center text-xs font-medium text-[#ABC4FF]">
        <div className="mr-1">{fieldName}</div>
        {tooltipContent && (
          <Tooltip className={className} placement="bottom-right" forceOpen={debugForceOpen}>
            <Icon size="xs" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>{tooltipContent}</Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="text-xs font-medium text-white">{fieldValue}</div>
    </Row>
  )
}

function UserLiquidityExhibition() {
  const { currentPoolInfo, currentPoolParsedInfo, currentHydratedInfo } = useLiquidity()
  const isRemoveDialogOpen = useLiquidity((s) => s.isRemoveDialogOpen)
  const rawBalances = useWallet((s) => s.rawBalances)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <div className="mt-12 max-w-[456px] self-center w-full">
      <div className="mb-6 text-xl font-medium text-white">Your Liquidity</div>
      <Card className="p-6 mt-6 mobile:py-5 mobile:px-3 bg-cyberpunk-card-bg w-full" size="lg">
        {currentHydratedInfo && currentPoolInfo && currentPoolParsedInfo ? (
          <List className={`flex flex-col gap-6 mobile:gap-5 mb-5`}>
            <List.Item>
              <FadeIn>
                <Row className="items-center justify-between">
                  <Row className="gap-2 items-center">
                    <CoinAvatarPair
                      className="justify-self-center"
                      token1={currentHydratedInfo.baseToken}
                      token2={currentHydratedInfo.quoteToken}
                      size={isMobile ? 'sm' : 'md'}
                    />
                    <div className="text-base font-normal text-[#abc4ff]">
                      {currentHydratedInfo.baseToken?.symbol ?? ''}/{currentHydratedInfo.quoteToken?.symbol ?? ''}
                    </div>
                  </Row>
                  <Tooltip>
                    <Icon
                      size="smi"
                      iconSrc="/icons/pools-remove-liquidity-entry.svg"
                      className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect`}
                      onClick={() => {
                        useLiquidity.setState({ isRemoveDialogOpen: true })
                      }}
                    />
                    <Tooltip.Panel>Remove Liquidity</Tooltip.Panel>
                  </Tooltip>
                </Row>
                <Col className="border-t-1.5 border-[rgba(171,196,255,.5)] mt-5 mobile:mt-4 py-5 gap-3">
                  <Row className="justify-between">
                    <div className="text-xs mobile:text-2xs font-medium text-[#abc4ff]">Your Liquidity</div>
                    <div className="text-xs mobile:text-2xs font-medium text-white">
                      {currentPoolInfo.lpMint
                        ? toString(div(rawBalances[String(currentPoolInfo.lpMint)], 10 ** currentPoolInfo.lpDecimals), {
                            decimalLength: `auto ${currentPoolInfo.lpDecimals}`
                          })
                        : '--'}{' '}
                      LP
                    </div>
                  </Row>
                </Col>
              </FadeIn>
            </List.Item>
          </List>
        ) : (
          <div>Loading info...</div>
        )}

        <RemoveLiquidityDialog
          open={isRemoveDialogOpen}
          onClose={() => {
            useLiquidity.setState({ isRemoveDialogOpen: false })
          }}
        />
      </Card>
    </div>
  )
}
