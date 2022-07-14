import useConnection from '@/application/connection/useConnection'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useLiquidity from '../useLiquidity'
import { LiquidityPoolInfo } from '@/application/liquidity/type'
import BN from 'bn.js'
import Market from '@/json/market.json'
import useWallet from '@/application/wallet/useWallet'
import useProgram, { CONFIG_PDA_SEED } from '@/application/program/useProgram'
import { web3 } from '@project-serum/anchor'
import { PublicKey } from '@solana/web3.js'
import { get_token_balance, lp_amount } from '@/solana/generalHelper'
import useToken from '@/application/token/useToken'
import hydrateLiquidityInfo from '@/application/liquidity/utils/hydrateLiquidityInfo'

/**
 * will load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default function useLiquidityInfoLoader({ disabled }: { disabled?: boolean } = {}) {
  const { currentPoolInfo, currentPoolParsedInfo } = useLiquidity()
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const rawBalances = useWallet((s) => s.rawBalances)
  const refreshCount = useLiquidity((s) => s.refreshCount)
  const connection = useConnection((s) => s.connection)
  const wallet = useWallet((s) => s.currentWallet)
  const program = useProgram((s) => s.program)

  /** fetch json info list  */
  useAsyncEffect(async () => {
    if (disabled) return
    const marketData = Market
    const pools: LiquidityPoolInfo[] = []
    for (let i = 0; i < marketData['official'].length; i++) {
      const poolInfo = marketData['official'][i]
      const pool: LiquidityPoolInfo = {
        id: poolInfo['id'],
        pair: poolInfo['pair'],
        baseMint: poolInfo['baseMint'],
        quoteMint: poolInfo['quoteMint'],
        lpMint: poolInfo['lpMint'],
        baseVault: poolInfo['baseVault'],
        quoteVault: poolInfo['quoteVault'],
        baseDecimals: poolInfo['baseDecimals'],
        quoteDecimals: poolInfo['quoteDecimals'],
        lpDecimals: poolInfo['lpDecimals'],
        authority: poolInfo['authority']
      }
      pools.push(pool)
    }
    if (pools.length > 0) {
      useLiquidity.setState({
        poolInfos: pools
      })
    }
  }, [disabled])

  useAsyncEffect(async () => {
    if (disabled) return
    if (connection && currentPoolInfo && wallet && program) {
      const [config] = await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(CONFIG_PDA_SEED),
          Buffer.from(currentPoolInfo.pair),
          new PublicKey(currentPoolInfo.baseMint).toBuffer(),
          new PublicKey(currentPoolInfo.quoteMint).toBuffer()
        ],
        program.programId
      )
      const config_fetch = await program.account.config.fetch(config)
      const token_x_balance = await get_token_balance(connection, new PublicKey(currentPoolInfo.baseVault))
      const token_y_balance = await get_token_balance(connection, new PublicKey(currentPoolInfo.quoteVault))

      useLiquidity.setState({
        currentPoolParsedInfo: {
          freeze: config_fetch.freezeProgram as boolean,
          freeze_liquidity: config_fetch.freezeLiquidity as boolean,
          freeze_swap: config_fetch.freezeSwap as boolean,
          baseReserve: lp_amount(token_x_balance ?? 0, currentPoolInfo.baseDecimals),
          quoteReserve: lp_amount(token_y_balance ?? 0, currentPoolInfo.quoteDecimals),
          lpSupply: config_fetch.totalAmountMinted as BN,
          feeNumerator: config_fetch.feeNumerator as BN,
          feeDenominator: config_fetch.feeDenominator as BN
        }
      })
    }
  }, [disabled, connection, refreshCount, currentPoolInfo, wallet, program])

  useAsyncEffect(async () => {
    if (disabled) return
    if (connection && currentPoolParsedInfo && currentPoolInfo) {
      const lpBalance = rawBalances[String(currentPoolInfo.lpMint)]
      const hydrated = await hydrateLiquidityInfo(currentPoolInfo, currentPoolParsedInfo, {
        getToken,
        getLpToken,
        lpBalance
      })
      useLiquidity.setState({
        currentHydratedInfo: hydrated
      })
    } else {
      useLiquidity.setState({ currentHydratedInfo: undefined })
    }
  }, [disabled, currentPoolParsedInfo, currentPoolInfo, getToken, getLpToken])
}
