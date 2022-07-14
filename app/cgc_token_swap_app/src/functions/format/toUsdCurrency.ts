import toBN from '@/functions/number/toBN'
import { Numberish } from '@/types/constants'
import { usdCurrency } from './toTokenPrice'
import { mul } from '../number/operations'
import { CurrencyAmount } from '@/types/entity'

export default function toUsdCurrency(amount: Numberish) {
  const amountBigNumber = toBN(mul(amount, 10 ** usdCurrency.decimals))
  return new CurrencyAmount(usdCurrency, amountBigNumber)
}
