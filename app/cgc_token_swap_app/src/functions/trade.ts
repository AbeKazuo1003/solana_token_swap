import { Currency, CurrencyAmount, divCeil, ONE, Percent, Price, Token, TokenAmount, ZERO } from '@/types/entity'
import { LiquidityParsedInfo, LiquidityPoolInfo } from '@/application/liquidity/type'
import { PublicKey } from '@solana/web3.js'

export interface GetBestAmountOutParams {
  poolInfo: LiquidityPoolInfo
  poolParsedInfo: LiquidityParsedInfo
  amountIn: CurrencyAmount | TokenAmount
  currencyOut: Currency | Token
  slippage: Percent
}
export type AmountSide = 'base' | 'quote'

export interface LiquidityComputeAnotherAmountParams {
  poolInfo: LiquidityPoolInfo
  poolParsedInfo: LiquidityParsedInfo
  amount: CurrencyAmount | TokenAmount
  anotherCurrency: Currency | Token
  slippage: Percent
}

export class Trade {
  static getBestAmountOut({ poolInfo, poolParsedInfo, amountIn, currencyOut, slippage }: GetBestAmountOutParams) {
    // the output amount for the trade assuming no slippage
    let _amountOut = currencyOut instanceof Token ? new TokenAmount(currencyOut, 0) : new CurrencyAmount(currencyOut, 0)
    let _minAmountOut = _amountOut
    let _currentPrice: Price | null = null
    // the price expressed in terms of output amount/input amount
    let _executionPrice: Price | null = null
    // the percent difference between the mid price before the trade and the trade execution price
    let _priceImpact = new Percent(ZERO)
    let _fee: CurrencyAmount | undefined = undefined

    try {
      const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Trade.computeAmountOut({
        poolInfo,
        poolParsedInfo,
        amountIn,
        currencyOut,
        slippage
      })
      _amountOut = amountOut
      _minAmountOut = minAmountOut
      _currentPrice = currentPrice
      _executionPrice = executionPrice
      _priceImpact = priceImpact
      _fee = fee
      // eslint-disable-next-line no-empty
    } catch (error) {}
    return {
      amountOut: _amountOut,
      minAmountOut: _minAmountOut,
      currentPrice: _currentPrice,
      executionPrice: _executionPrice,
      priceImpact: _priceImpact,
      fee: _fee
    }
  }

  static computeAmountOut = ({
    poolInfo,
    poolParsedInfo,
    amountIn,
    currencyOut,
    slippage
  }: GetBestAmountOutParams):
    | {
        amountOut: CurrencyAmount
        minAmountOut: CurrencyAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
        fee: CurrencyAmount
      }
    | {
        amountOut: TokenAmount
        minAmountOut: TokenAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
        fee: CurrencyAmount
      } => {
    const { baseReserve, quoteReserve } = poolParsedInfo
    const currencyIn = amountIn instanceof TokenAmount ? amountIn.token : amountIn.currency

    const reserves = [baseReserve, quoteReserve]
    // input is fixed
    const input = this._getAmountSide(amountIn, poolInfo)
    if (input === 'quote') {
      reserves.reverse()
    }
    const [reserveIn, reserveOut] = reserves
    const currentPrice = new Price(currencyIn, reserveIn, currencyOut, reserveOut)
    const amountInRaw = amountIn.raw

    let amountOutRaw = ZERO
    let feeRaw = ZERO

    if (!amountInRaw.isZero()) {
      feeRaw = amountInRaw.mul(poolParsedInfo.feeNumerator).div(poolParsedInfo.feeDenominator)
      const amountInWithFee = amountInRaw.sub(feeRaw)
      const denominator = reserveIn.add(amountInWithFee)
      amountOutRaw = reserveOut.mul(amountInWithFee).div(denominator)
    }
    const _slippage = new Percent(ONE).add(slippage)
    const minAmountOutRaw = _slippage.invert().mul(amountOutRaw).quotient

    const amountOut =
      currencyOut instanceof Token
        ? new TokenAmount(currencyOut, amountOutRaw)
        : new CurrencyAmount(currencyOut, amountOutRaw)
    const minAmountOut =
      currencyOut instanceof Token
        ? new TokenAmount(currencyOut, minAmountOutRaw)
        : new CurrencyAmount(currencyOut, minAmountOutRaw)
    let executionPrice = new Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw)
    if (!amountInRaw.isZero() && !amountOutRaw.isZero()) {
      executionPrice = new Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw)
    }
    const priceImpact = new Percent(
      parseInt(String(Math.abs(parseFloat(executionPrice.toFixed()) - parseFloat(currentPrice.toFixed())) * 1e9)),
      parseInt(String(parseFloat(currentPrice.toFixed()) * 1e9))
    )
    const fee =
      currencyIn instanceof Token ? new TokenAmount(currencyIn, feeRaw) : new CurrencyAmount(currencyIn, feeRaw)

    return {
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee
    }
  }

  /**
   * Get currency amount side of liquidity pool
   * @param amount - the currency amount provided
   * @param poolInfo
   * @returns currency amount side is `base` or `quote`
   */
  static _getAmountSide(amount: CurrencyAmount | TokenAmount, poolInfo: LiquidityPoolInfo): AmountSide {
    const token = amount instanceof TokenAmount ? amount.token : Token.WSOL

    return this._getTokenSide(token, poolInfo)
  }

  /**
   * Get token side of liquidity pool
   * @param token - the token provided
   * @param poolInfo
   * @returns token side is `base` or `quote`
   */
  static _getTokenSide(token: Token, poolInfo: LiquidityPoolInfo): AmountSide {
    const { baseMint, quoteMint } = poolInfo
    if (token.mint.equals(new PublicKey(baseMint))) return 'base'
    else if (token.mint.equals(new PublicKey(quoteMint))) return 'quote'
    return 'base'
  }

  static getEnabledFeatures(poolParsedInfo: LiquidityParsedInfo) {
    let swap_available = false
    let liquidity_available = false
    if (poolParsedInfo.freeze) {
      return {
        swap: false,
        liquidity: false
      }
    }
    swap_available = !poolParsedInfo.freeze_swap
    liquidity_available = !poolParsedInfo.freeze_liquidity
    return {
      swap: swap_available,
      liquidity: liquidity_available
    }
  }

  static computeAnotherAmount({
    poolInfo,
    poolParsedInfo,
    amount,
    anotherCurrency,
    slippage
  }: LiquidityComputeAnotherAmountParams):
    | { anotherAmount: CurrencyAmount; maxAnotherAmount: CurrencyAmount }
    | { anotherAmount: TokenAmount; maxAnotherAmount: TokenAmount } {
    const { baseReserve, quoteReserve } = poolParsedInfo
    const input = this._getAmountSide(amount, poolInfo)

    // round up
    let amountRaw = ZERO
    if (!amount.isZero()) {
      amountRaw =
        input === 'base'
          ? divCeil(amount.raw.mul(quoteReserve), baseReserve)
          : divCeil(amount.raw.mul(baseReserve), quoteReserve)
    }

    const _slippage = new Percent(ONE).add(slippage)
    const slippageAdjustedAmount = _slippage.mul(amountRaw).quotient

    const _anotherAmount =
      anotherCurrency instanceof Token
        ? new TokenAmount(anotherCurrency, amountRaw)
        : new CurrencyAmount(anotherCurrency, amountRaw)
    const _maxAnotherAmount =
      anotherCurrency instanceof Token
        ? new TokenAmount(anotherCurrency, slippageAdjustedAmount)
        : new CurrencyAmount(anotherCurrency, slippageAdjustedAmount)
    return {
      anotherAmount: _anotherAmount,
      maxAnotherAmount: _maxAnotherAmount
    }
  }
}
