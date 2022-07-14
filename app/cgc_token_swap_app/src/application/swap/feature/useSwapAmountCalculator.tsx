import { useRouter } from 'next/router'
import { Connection } from '@solana/web3.js'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { HexAddress, Numberish } from '@/types/constants'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { SplToken } from '@/application/token/type'

import { useSwap } from '@/application/swap/useSwap'
import { useEffect } from 'react'
import useWallet from '@/application/wallet/useWallet'
import { eq } from '@/functions/number/compare'
import { deUIToken, deUITokenAmount, toUITokenAmount } from '@/application/token/utils/quantumSOL'
import { LiquidityParsedInfo } from '@/application/liquidity/type'
import useProgram from '@/application/program/useProgram'
import { Wallet } from '@solana/wallet-adapter-react'
import * as anchor from '@project-serum/anchor'
import sdkParseJsonLiquidityInfo from '@/application/liquidity/utils/sdkParseJsonLiquidityInfo'
import { Trade } from '@/functions/trade'

export function useSwapAmountCalculator() {
  const { pathname } = useRouter()

  const connection = useConnection((s) => s.connection)
  const wallet = useWallet((s) => s.currentWallet)
  const program = useProgram((s) => s.program)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)
  const userCoin1Amount = useSwap((s) => s.coin1Amount)
  const userCoin2Amount = useSwap((s) => s.coin2Amount)
  const refreshCount = useSwap((s) => s.refreshCount)
  const directionReversed = useSwap((s) => s.directionReversed)
  const focusSide = directionReversed ? 'coin2' : 'coin1' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const connected = useWallet((s) => s.connected)

  /** for swap is always from up to down, up/down is easier to calc */
  const upCoin = directionReversed ? coin2 : coin1
  const upCoinAmount = (directionReversed ? userCoin2Amount : userCoin1Amount) || '0'
  const downCoin = directionReversed ? coin1 : coin2
  const downCoinAmount = (directionReversed ? userCoin1Amount : userCoin2Amount) || '0'

  const poolInfos = useLiquidity((s) => s.poolInfos)
  useEffect(() => {
    cleanCalcCache()
  }, [refreshCount])

  // if don't check focusSideCoin, it will calc twice.
  // one for coin1Amount then it will change coin2Amount
  // changing coin2Amount will cause another calc
  useAsyncEffect(async () => {
    // pairInfo is not enough
    if (!upCoin || !downCoin || !connection || !pathname.startsWith('/swap')) {
      useSwap.setState({
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        priceImpact: undefined,
        executionPrice: undefined,
        ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: undefined }
      })
      return
    }

    const focusDirectionSide = 'up' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready

    try {
      const calcResult = await calculatePairTokenAmount({
        upCoin,
        upCoinAmount,
        downCoin,
        connection,
        slippageTolerance,
        wallet,
        program
      })
      // for calculatePairTokenAmount is async, result maybe droped. if that, just stop it
      const resultStillFresh = (() => {
        const directionReversed = useSwap.getState().directionReversed
        const currentUpCoinAmount =
          (directionReversed ? useSwap.getState().coin2Amount : useSwap.getState().coin1Amount) || '0'
        const currentDownCoinAmount =
          (directionReversed ? useSwap.getState().coin1Amount : useSwap.getState().coin2Amount) || '0'
        const currentFocusSideAmount = focusDirectionSide === 'up' ? currentUpCoinAmount : currentDownCoinAmount
        const focusSideAmount = focusDirectionSide === 'up' ? upCoinAmount : downCoinAmount
        return eq(currentFocusSideAmount, focusSideAmount)
      })()
      if (!resultStillFresh) return
      if (focusDirectionSide === 'up') {
        const { priceImpact, executionPrice, currentPrice, swapable, fee } = calcResult ?? {}
        const { amountOut, minAmountOut } = (calcResult?.info ?? {}) as { amountOut?: string; minAmountOut?: string }
        useSwap.setState({
          fee,
          priceImpact,
          executionPrice,
          currentPrice,
          minReceived: minAmountOut,
          maxSpent: undefined,
          swapable,
          ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: amountOut }
        })
      } else {
        const { priceImpact, executionPrice, currentPrice, swapable, fee } = calcResult ?? {}
        const { amountIn, maxAmountIn } = (calcResult?.info ?? {}) as { amountIn?: string; maxAmountIn?: string }
        useSwap.setState({
          fee,
          priceImpact,
          executionPrice,
          currentPrice,
          minReceived: undefined,
          maxSpent: maxAmountIn,
          swapable,
          ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: amountIn }
        })
      }
    } catch (err) {
      console.error(err)
    }
  }, [
    upCoin,
    downCoin,
    upCoinAmount,
    downCoinAmount,
    directionReversed,
    focusSide,
    slippageTolerance,
    connection,
    wallet,
    program,
    pathname,
    refreshCount,
    connected, // init fetch data
    poolInfos
  ])
}

const sdkParsedInfoCache = new Map<HexAddress, LiquidityParsedInfo>()

type SwapCalculatorInfo = {
  executionPrice: ReturnType<typeof Trade['getBestAmountOut']>['executionPrice']
  currentPrice: ReturnType<typeof Trade['getBestAmountOut']>['currentPrice']
  priceImpact: ReturnType<typeof Trade['getBestAmountOut']>['priceImpact']
  fee: ReturnType<typeof Trade['getBestAmountOut']>['fee']
  swapable: boolean
  info: { amountOut: string; minAmountOut: string } | { amountIn: string; maxAmountIn: string }
}

function cleanCalcCache() {
  sdkParsedInfoCache.clear()
}

async function calculatePairTokenAmount({
  upCoin,
  upCoinAmount,
  downCoin,
  connection,
  slippageTolerance,
  wallet,
  program
}: {
  upCoin: SplToken
  upCoinAmount: Numberish | undefined
  downCoin: SplToken
  connection: Connection
  slippageTolerance: Numberish
  wallet: Wallet | null | undefined
  program: anchor.Program<anchor.Idl> | undefined
}): Promise<SwapCalculatorInfo | undefined> {
  const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })

  const { best } = await useLiquidity.getState().findLiquidityInfoByTokenMint(upCoin.mint, downCoin.mint)

  if (best) {
    const key = best.id
    const sdkParsedInfo = sdkParsedInfoCache.has(key)
      ? sdkParsedInfoCache.get(key)!
      : await (async () => {
          const sdkParsed = await sdkParseJsonLiquidityInfo(best, connection, wallet, program)
          if (sdkParsed) {
            sdkParsedInfoCache.set(key, sdkParsed)
          }
          return sdkParsed
        })()
    if (sdkParsedInfo) {
      const { amountOut, minAmountOut, executionPrice, currentPrice, priceImpact, fee } = Trade.getBestAmountOut({
        poolInfo: best,
        poolParsedInfo: sdkParsedInfo,
        currencyOut: deUIToken(downCoin),
        amountIn: deUITokenAmount(upCoinTokenAmount),
        slippage: toPercent(slippageTolerance)
      })
      const swapable = Trade.getEnabledFeatures(sdkParsedInfo).swap
      return {
        executionPrice,
        currentPrice,
        priceImpact,
        swapable,
        fee,
        info: {
          amountOut: toUITokenAmount(amountOut).toExact(),
          minAmountOut: toUITokenAmount(minAmountOut).toExact()
        }
      }
    } else {
      return undefined
    }
  }
}
