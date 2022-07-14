import type { NextPage } from 'next'
import { createRef, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import { useSwapTwoElements } from '@/hooks/useSwapTwoElements'
import Button, { ButtonHandle } from '@/components/Button'
import createContextStore from '@/functions/react/createContextStore'
import useWallet from '@/application/wallet/useWallet'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { useSwap } from '@/application/swap/useSwap'
import useToken from '@/application/token/useToken'
import { eq, gte, isMeaningfulNumber, lt, lte } from '@/functions/number/compare'
import { routeTo } from '@/application/routeTools'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import useSwapInitCoinFiller from '@/application/swap/feature/useSwapInitCoinFiller'
import useSwapUrlParser from '@/application/swap/feature/useSwapUrlParser'
import { div, mul } from '@/functions/number/operations'
import { SOLDecimals } from '@/application/token/utils/quantumSOL'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import { toString } from '@/functions/number/toString'
import Icon from '@/components/Icon'
import Col from '@/components/Col'
import { twMerge } from 'tailwind-merge'
import RefreshCircle from '@/components/RefreshCircle'
import { useSwapAmountCalculator } from '@/application/swap/feature/useSwapAmountCalculator'
import Tooltip from '@/components/Tooltip'
import Input from '@/components/Input'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useNotification from '@/application/notification/useNotification'
import { Numberish } from '@/types/constants'
import txSwap from '@/application/swap/transaction/txSwap'

const { ContextProvider: SwapUIContextProvider, useStore: useSwapContextStore } = createContextStore({
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  swapButtonComponentRef: createRef<ButtonHandle>()
})

function SwapEffect() {
  useSwapInitCoinFiller()
  useSwapUrlParser()
  useSwapAmountCalculator()
  return null
}

const Swap: NextPage = () => {
  return (
    <SwapUIContextProvider>
      <SwapEffect />
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
          <Row className="justify-center  mb-12 mobile:mb-2">
            <Tabs
              currentValue={'Swap'}
              values={['Swap', 'Liquidity']}
              onChange={(newTab) => {
                if (newTab === 'Liquidity') {
                  routeTo('/liquidity')
                }
              }}
            />
          </Row>
          <SwapCard />
        </main>
      </div>
    </SwapUIContextProvider>
  )
}

function SwapCard() {
  const { connected: walletConnected } = useWallet()
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)
  const coin1Amount = useSwap((s) => s.coin1Amount)
  const coin2Amount = useSwap((s) => s.coin2Amount)
  const balances = useWallet((s) => s.balances)
  const directionReversed = useSwap((s) => s.directionReversed)
  const priceImpact = useSwap((s) => s.priceImpact)
  const refreshSwap = useSwap((s) => s.refreshSwap)
  const swapable = useSwap((s) => s.swapable)
  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)

  const { swapButtonComponentRef, coinInputBox1ComponentRef, coinInputBox2ComponentRef } = useSwapContextStore()
  const upCoin = directionReversed ? coin2 : coin1
  // although info is included in routes, still need upCoinAmount to pop friendly feedback
  const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'

  const downCoin = directionReversed ? coin1 : coin2
  // although info is included in routes, still need downCoinAmount to pop friendly feedback
  const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'
  const haveEnoughUpCoin = useMemo(
    () => upCoin && checkWalletHasEnoughBalance(toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })),
    [upCoin, upCoinAmount, checkWalletHasEnoughBalance, balances]
  )

  const switchDirectionReversed = useCallback(() => {
    useSwap.setState((s) => ({ directionReversed: !s.directionReversed }))
  }, [])

  const executionPrice = useSwap((s) => s.executionPrice)

  const swapElementBox1 = useRef<HTMLDivElement>(null)
  const swapElementBox2 = useRef<HTMLDivElement>(null)

  const [hasUISwrapped, { toggleSwap: toggleUISwap }] = useSwapTwoElements(swapElementBox1, swapElementBox2, {
    defaultHasWrapped: directionReversed
  })

  useEffect(() => {
    useSwap.setState({ directionReversed: hasUISwrapped })
  }, [hasUISwrapped])
  const hasSwapDetermined =
    coin1 && isMeaningfulNumber(coin1Amount) && coin2 && isMeaningfulNumber(coin2Amount) && executionPrice
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useSwap.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="w-[min(456px,100%)] self-center cyberpunk-bg-light"
      className="py-8 pt-4 px-6 mobile:py-5 mobile:px-3"
    >
      <div className="space-y-5 mt-5">
        <CoinInputBox
          domRef={swapElementBox1}
          disabled={isApprovePanelShown}
          disabledInput={directionReversed}
          componentRef={coinInputBox1ComponentRef}
          haveHalfButton
          haveCoinIcon
          showTokenSelectIcon
          topLeftLabel={hasUISwrapped ? 'To' : 'From'}
          onTryToTokenSelect={() => {}}
          onEnter={(input) => {
            if (!input) return
            if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
            if (coin2 && coin2Amount) swapButtonComponentRef.current?.click?.()
          }}
          token={coin1}
          value={coin1Amount ? (eq(coin1Amount, 0) ? '' : toString(coin1Amount)) : undefined}
          onUserInput={(value) => {
            useSwap.setState({ focusSide: 'coin1', coin1Amount: value })
          }}
        />
        <div className="relative h-8">
          <Row
            className={`absolute items-center transition-all ${
              executionPrice ? 'left-4' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            <Icon
              size="sm"
              iconSrc="/icons/msic-swap.svg"
              className={`p-2 frosted-glass frosted-glass-teal rounded-full mr-4 ${
                isApprovePanelShown ? 'not-clickable' : 'clickable'
              } select-none transition`}
              onClick={() => {
                if (isApprovePanelShown) return
                toggleUISwap()
                switchDirectionReversed()
              }}
            />
            {executionPrice && (
              <div className="absolute left-full">
                <SwapCardPriceIndicator />
              </div>
            )}
          </Row>
          <div className="absolute right-0">
            <RefreshCircle
              run={!isApprovePanelShown}
              refreshKey="swap"
              popPlacement="right-bottom"
              freshFunction={() => {
                refreshSwap()
                refreshTokenPrice()
              }}
            />
          </div>
        </div>
        <CoinInputBox
          domRef={swapElementBox2}
          disabled={isApprovePanelShown}
          disabledInput={!directionReversed}
          componentRef={coinInputBox2ComponentRef}
          haveHalfButton
          haveCoinIcon
          showTokenSelectIcon
          topLeftLabel={hasUISwrapped ? 'From' : 'To'}
          onTryToTokenSelect={() => {}}
          onEnter={(input) => {
            if (!input) return
            if (!coin1) coinInputBox1ComponentRef.current?.selectToken?.()
            if (coin1 && coin1Amount) swapButtonComponentRef.current?.click?.()
          }}
          token={coin2}
          value={coin2Amount ? (eq(coin2Amount, 0) ? '' : toString(coin2Amount)) : undefined}
          onUserInput={(value) => {
            useSwap.setState({ focusSide: 'coin2', coin2Amount: value })
          }}
        />
      </div>
      <FadeInStable show={hasSwapDetermined}>
        <SwapCardInfo className="mt-5" />
      </FadeInStable>
      <Button
        className="w-full frosted-glass-teal mt-5"
        disabled={isApprovePanelShown}
        componentRef={swapButtonComponentRef}
        validators={[
          {
            should: walletConnected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Wallet'
            }
          },
          {
            should: upCoin && downCoin,
            fallbackProps: { children: 'Select a token' }
          },
          {
            should: swapable !== false,
            fallbackProps: { children: 'Pool Not Ready' }
          },
          {
            should:
              upCoinAmount && isMeaningfulNumber(upCoinAmount) && downCoinAmount && isMeaningfulNumber(downCoinAmount),
            fallbackProps: { children: 'Enter an amount' }
          },
          {
            should: haveEnoughUpCoin,
            fallbackProps: { children: `Insufficient ${upCoin?.symbol ?? ''} balance` }
          },
          {
            should: priceImpact && lte(priceImpact, 0.05),
            forceActive: true,
            fallbackProps: {
              onClick: () => popPriceConfirm({ priceImpact })
            }
          }
        ]}
        onClick={() => {
          txSwap().then(({ allSuccess }) => {
            if (allSuccess) {
              const { logSuccess } = useNotification.getState()
              logSuccess('Success', `Swap Success!`)
            }
          })
        }}
      >
        Swap
      </Button>
      <RemainSOLAlert />
    </CyberpunkStyleCard>
  )
}
export default Swap

function SwapCardInfo({ className }: { className?: string }) {
  const priceImpact = useSwap((s) => s.priceImpact)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)

  const focusSide = useSwap((s) => s.focusSide)
  const minReceived = useSwap((s) => s.minReceived)
  const fee = useSwap((s) => s.fee)
  const maxSpent = useSwap((s) => s.maxSpent)
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)

  const isDangerousPrice = useMemo(() => priceImpact != null && gte(priceImpact, 0.05), [priceImpact])
  const isWarningPrice = useMemo(() => priceImpact != null && gte(priceImpact, 0.01), [priceImpact])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <Col
      className={twMerge(
        `py-4 px-6 flex-grow border-1.5  ${
          isDangerousPrice
            ? 'border-[#DA2EEF]'
            : isWarningPrice
            ? 'border-[rgba(216,203,57,.5)]'
            : 'border-[rgba(171,196,255,.5)]'
        } rounded-xl items-center gap-3 transition-colors`,
        className
      )}
    >
      {maxSpent ? (
        <SwapCardItem
          fieldName="Maximum Spent"
          fieldValue={`${maxSpent ?? ''} ${(focusSide === 'coin1' ? coin2 : coin1)?.symbol ?? '--'}`}
          tooltipContent="The max amount of tokens you will spend on this trade"
        />
      ) : (
        <SwapCardItem
          fieldName="Minimum Received"
          fieldValue={`${minReceived ?? ''} ${(focusSide === 'coin1' ? coin2 : coin1)?.symbol ?? '--'}`}
          tooltipContent="The least amount of tokens you will recieve on this trade"
        />
      )}
      <SwapCardItem
        fieldName="Price Impact"
        fieldNameTextColor={isDangerousPrice ? '#DA2EEF' : isWarningPrice ? '#D8CB39' : undefined}
        fieldValue={priceImpact ? (lt(priceImpact, 0.001) ? '<0.1%' : toPercentString(priceImpact)) : '--'}
        fieldValueTextColor={isDangerousPrice ? '#DA2EEF' : isWarningPrice ? '#D8CB39' : '#39D0D8'}
        tooltipContent="The difference between the market price and estimated price due to trade size"
      />

      <SwapCardItem
        fieldName="Slippage Tolerance"
        tooltipContent="The maximum difference between your estimated price and execution price"
        fieldValue={
          <Row className="py-1 px-2 bg-[#141041] rounded-sm text-[#F1F1F2] font-medium text-xs -my-1">
            <Input
              className="w-6"
              disabled={isApprovePanelShown}
              value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
              onUserInput={(value) => {
                const n = div(parseFloat(value), 100)
                if (n) {
                  useAppSettings.setState({ slippageTolerance: n })
                }
              }}
              pattern={/^\d*\.?\d*$/}
            />
            <div className="opacity-50 ml-1">%</div>
          </Row>
        }
      />
      <SwapCardItem
        fieldName="Swap Fee"
        tooltipContent="Swap Fee"
        fieldValue={
          fee ? (
            <Col>
              <div key={fee.currency.symbol} className="text-right">
                {toString(fee)} {fee.currency.symbol}
              </div>
            </Col>
          ) : (
            '--'
          )
        }
      />
    </Col>
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

function SwapCardPriceIndicator({ className }: { className?: string }) {
  const [innerReversed, setInnerReversed] = useState(false)

  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)

  const directionReversed = useSwap((s) => s.directionReversed)
  const upCoin = directionReversed ? coin2 : coin1
  const downCoin = directionReversed ? coin1 : coin2
  const executionPrice = useSwap((s) => s.executionPrice)
  const priceImpact = useSwap((s) => s.priceImpact)

  const isDangerousPrice = useMemo(() => priceImpact != null && gte(priceImpact, 0.05), [priceImpact])
  const isWarningPrice = useMemo(() => priceImpact != null && gte(priceImpact, 0.01), [priceImpact])
  const isMobile = useAppSettings((s) => s.isMobile)
  const innerPriceLeftCoin = innerReversed ? downCoin : upCoin
  const innerPriceRightCoin = innerReversed ? upCoin : downCoin
  return (
    <Col>
      <FadeIn>
        {executionPrice && (
          <Row className={twMerge('font-medium text-sm text-[#ABC4FF]', className)}>
            <div className="whitespace-nowrap">
              {1} {innerPriceLeftCoin?.symbol ?? '--'} ≈{' '}
              {toString(innerReversed ? div(1, executionPrice) : executionPrice, {
                decimalLength: isMobile ? 'auto 2' : 'auto',
                zeroDecimalNotAuto: true
              })}{' '}
              {innerPriceRightCoin?.symbol ?? '--'}
            </div>
            <div className="ml-2 clickable" onClick={() => setInnerReversed((b) => !b)}>
              ⇋
            </div>
          </Row>
        )}
      </FadeIn>
      <FadeIn>
        {priceImpact ? (
          <div
            className={`font-medium text-xs whitespace-nowrap ${
              isDangerousPrice ? 'text-[#DA2EEF]' : isWarningPrice ? 'text-[#D8CB39]' : 'text-[#39D0D8]'
            } transition-colors`}
          >
            {isDangerousPrice || isWarningPrice ? 'Price Impact Warning' : 'Low Price Impact'}
          </div>
        ) : null}
      </FadeIn>
    </Col>
  )
}

function SwapCardItem({
  className,
  fieldName,
  fieldValue,
  tooltipContent,
  fieldNameTextColor,
  fieldValueTextColor
}: {
  className?: string
  fieldName?: string
  fieldValue?: ReactNode
  tooltipContent?: ReactNode
  fieldNameTextColor?: string // for price impact warning color
  fieldValueTextColor?: string // for price impact warning color
}) {
  return (
    <Row className={twMerge('w-full justify-between', className)}>
      <Row className="items-center text-xs font-medium text-[#ABC4FF]" style={{ color: fieldNameTextColor }}>
        <div className="mr-1">{fieldName}</div>
        {tooltipContent && (
          <Tooltip className={className} placement="bottom-right">
            <Icon size="xs" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>
              <div className="max-w-[30em]">{tooltipContent}</div>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="text-xs font-medium text-white" style={{ color: fieldValueTextColor }}>
        {fieldValue}
      </div>
    </Row>
  )
}

function popPriceConfirm({ priceImpact }: { priceImpact?: Numberish }) {
  useNotification.getState().popConfirm({
    type: 'error',
    title: 'Price Impact Warning',
    description: (
      <div>
        Price impact is{' '}
        {priceImpact ? (
          <>
            <span className="text-[#DA2EEF]">{toPercentString(priceImpact)}</span> which is{' '}
          </>
        ) : (
          ''
        )}
        <span className="text-[#DA2EEF]">higher than 5%.</span> Try a smaller trade!
      </div>
    ),
    confirmButtonText: 'Swap Anyway',
    onConfirm: () => {
      txSwap().then(({ allSuccess }) => {
        if (allSuccess) {
          const { logSuccess } = useNotification.getState()
          logSuccess('Success', `Swap Success!`)
        }
      })
    }
  })
}
