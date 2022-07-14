import { LiquidityParsedInfo, LiquidityPoolInfo } from '@/application/liquidity/type'
import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import useProgram, { CONFIG_PDA_SEED } from '@/application/program/useProgram'
import { web3 } from '@project-serum/anchor'
import { PublicKey } from '@solana/web3.js'
import { get_token_balance, lp_amount } from '@/solana/generalHelper'
import BN from 'bn.js'

export default async function sdkParseJsonLiquidityInfo(
  liquidityPoolInfo: LiquidityPoolInfo,
  connection = useConnection.getState().connection,
  wallet = useWallet.getState().currentWallet,
  program = useProgram.getState().program
): Promise<LiquidityParsedInfo | undefined> {
  if (connection && wallet && program) {
    try {
      const [config] = await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(CONFIG_PDA_SEED),
          Buffer.from(liquidityPoolInfo.pair),
          new PublicKey(liquidityPoolInfo.baseMint).toBuffer(),
          new PublicKey(liquidityPoolInfo.quoteMint).toBuffer()
        ],
        program.programId
      )
      const config_fetch = await program.account.config.fetch(config)
      const token_x_balance = await get_token_balance(connection, new PublicKey(liquidityPoolInfo.baseVault))
      const token_y_balance = await get_token_balance(connection, new PublicKey(liquidityPoolInfo.quoteVault))
      return {
        freeze: config_fetch.freezeProgram as boolean,
        freeze_liquidity: config_fetch.freezeLiquidity as boolean,
        freeze_swap: config_fetch.freezeSwap as boolean,
        baseReserve: lp_amount(token_x_balance ?? 0, liquidityPoolInfo.baseDecimals),
        quoteReserve: lp_amount(token_y_balance ?? 0, liquidityPoolInfo.quoteDecimals),
        lpSupply: config_fetch.totalAmountMinted as BN,
        feeNumerator: config_fetch.feeNumerator as BN,
        feeDenominator: config_fetch.feeDenominator as BN
      }
    } catch (err) {
      console.error(err)
      return undefined
    }
  } else {
    return undefined
  }
}
