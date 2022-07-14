import { Numberish } from '@/types/constants'
import toUsdCurrency from './toUsdCurrency'
import { mul } from '../number/operations'
import { toString } from '../number/toString'
import { CurrencyAmount, Price } from '@/types/entity'

/**
 * tokenPrice * amount = totalPrice
 *
 * amount should be decimaled (e.g. 20.323 RAY)
 * @example
 * Eth price: Price {4600 usd/eth}
 * amount: BN {10} (or you can imput Fraction {10})
 * totalPrice: CurrencyAmount { 46000 usd }
 */
export default function toTotalPrice(amount: Numberish | undefined, price: Price | undefined): CurrencyAmount {
  if (!price || !amount) return toUsdCurrency(0)
  return toUsdCurrency(mul(amount, toString(price)))
}
