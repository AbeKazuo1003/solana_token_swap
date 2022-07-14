import useWallet from '@/application/wallet/useWallet'
import useProgram, { CONFIG_PDA_SEED } from '@/application/program/useProgram'
import useConnection from '@/application/connection/useConnection'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { useSwap } from '@/application/swap/useSwap'
import useNotification from '@/application/notification/useNotification'
import { noTailingPeriod } from '@/functions/format/noTailingPeriod'
import assert from '@/functions/assert'
import { gt } from '@/functions/number/compare'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKey } from '@solana/web3.js'
import useLiquidity from '@/application/liquidity/useLiquidity'
import * as anchor from '@project-serum/anchor'
import useToken from '@/application/token/useToken'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

type FinalInfo = {
  allSuccess: boolean
  txid: string
}

export default function txSwap(): Promise<FinalInfo> {
  return new Promise((resolve) =>
    (async () => {
      const { checkWalletHasEnoughBalance, owner, getTokenAccount } = useWallet.getState()
      const program = useProgram.getState().program
      const connection = useConnection.getState().connection
      const { getToken } = useToken.getState()
      const isApprovePanelShown = useAppSettings.getState().isApprovePanelShown
      if (isApprovePanelShown) return
      const { coin1, coin2, coin1Amount, coin2Amount, directionReversed, minReceived, maxSpent } = useSwap.getState()
      const { findLiquidityInfoByTokenMint } = useLiquidity.getState()
      useAppSettings.setState({ isApprovePanelShown: true })
      try {
        assert(connection, 'no rpc connection')
        assert(program, 'market not found')
        assert(owner, 'wallet not found')
        const upCoin = directionReversed ? coin2 : coin1
        // although info is included in routes, still need upCoinAmount to pop friendly feedback
        const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'
        const downCoin = directionReversed ? coin1 : coin2
        // although info is included in routes, still need downCoinAmount to pop friendly feedback
        const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'
        assert(upCoinAmount && gt(upCoinAmount, 0), 'should input upCoin amount larger than 0')
        assert(downCoinAmount && gt(downCoinAmount, 0), 'should input downCoin amount larger than 0')
        assert(upCoin, 'select a coin in upper box')
        assert(downCoin, 'select a coin in lower box')
        assert(String(upCoin.mint) !== String(downCoin.mint), 'should not select same mint ')

        const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
        const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })
        assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)
        const marketInfo = (await findLiquidityInfoByTokenMint(coin1?.mint, coin2?.mint)).best
        assert(marketInfo, `can't find pool`)

        const baseToken = getToken(marketInfo.baseMint)
        assert(baseToken, `can't find base token in tokenList`)
        const quoteToken = getToken(marketInfo.quoteMint)
        assert(quoteToken, `can't find quote token in tokenList`)
        const baseTokenAccount = getTokenAccount(marketInfo.baseMint)
        const quoteTokenAccount = getTokenAccount(marketInfo.quoteMint)
        assert(baseTokenAccount?.publicKey, `user haven't base token's account`)
        assert(quoteTokenAccount?.publicKey, `user haven't quote token's account`)

        const tokenXMint = new PublicKey(marketInfo.baseMint)
        const tokenYMint = new PublicKey(marketInfo.quoteMint)
        const tokenXVault = new PublicKey(marketInfo.baseVault)
        const tokenYVault = new PublicKey(marketInfo.quoteVault)
        const poolAuthority = new PublicKey(marketInfo.authority)
        const [config] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(CONFIG_PDA_SEED),
            Buffer.from(marketInfo.pair),
            new PublicKey(marketInfo.baseMint).toBuffer(),
            new PublicKey(marketInfo.quoteMint).toBuffer()
          ],
          program.programId
        )

        const tx_hash = await program.methods
          .swap(marketInfo.pair, upCoinTokenAmount.raw, downCoinTokenAmount.raw, directionReversed ? 1 : 0)
          .accounts({
            owner: owner,
            config: config,
            tokenXMint: tokenXMint,
            tokenYMint: tokenYMint,
            tokenXVault: tokenXVault,
            tokenYVault: tokenYVault,
            poolAuthority: poolAuthority,
            userTokenXVault: baseTokenAccount.publicKey,
            userTokenYVault: quoteTokenAccount.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID
          })
          .rpc()
        await connection.confirmTransaction(tx_hash, 'finalized')
        resolve({
          allSuccess: true,
          txid: tx_hash
        })
      } catch (error) {
        const { logError } = useNotification.getState()
        console.warn(error)
        const errorTitle = 'Error'
        const errorDescription = error instanceof Error ? noTailingPeriod(error.message) : String(error)
        logError(errorTitle, errorDescription)
        resolve({
          allSuccess: false,
          txid: ''
        })
      } finally {
        useAppSettings.setState({ isApprovePanelShown: false })
      }
    })()
  )
}
