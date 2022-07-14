import useLiquidity from '@/application/liquidity/useLiquidity'
import assert from '@/functions/assert'
import { gt } from '@/functions/number/compare'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useWallet from '@/application/wallet/useWallet'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useProgram, { CONFIG_PDA_SEED } from '@/application/program/useProgram'
import useNotification from '@/application/notification/useNotification'
import { noTailingPeriod } from '@/functions/format/noTailingPeriod'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import useConnection from '@/application/connection/useConnection'
import * as anchor from '@project-serum/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { findAssociatedTokenAddress } from '@/solana/generalHelper'

type FinalInfo = {
  allSuccess: boolean
  txid: string
}

export default function toAddLiquidity(): Promise<FinalInfo> {
  return new Promise((resolve) =>
    (async () => {
      const { checkWalletHasEnoughBalance, owner, getTokenAccount } = useWallet.getState()
      const slippage = useAppSettings.getState().slippageTolerance
      const program = useProgram.getState().program
      const connection = useConnection.getState().connection
      const isApprovePanelShown = useAppSettings.getState().isApprovePanelShown
      if (isApprovePanelShown) return
      const {
        coin1,
        coin2,
        coin1Amount,
        coin2Amount,
        currentPoolInfo,
        focusSide,
        unslippagedCoin1Amount,
        unslippagedCoin2Amount
      } = useLiquidity.getState()
      useAppSettings.setState({ isApprovePanelShown: true })
      try {
        assert(connection, 'no rpc connection')
        assert(program, 'market not found')
        assert(owner, 'wallet not found')
        assert(currentPoolInfo, `can't find liquidity pool`)
        assert(coin1, 'select a coin in upper box')
        assert(coin2, 'select a coin in lower box')
        assert(String(coin1.mint) !== String(coin2.mint), 'should not select same mint ')
        assert(coin1Amount && gt(coin1Amount, 0), 'should input coin1 amount larger than 0')
        assert(coin2Amount && gt(coin2Amount, 0), 'should input coin2 amount larger than 0')
        const coin1TokenAmount = toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true })
        const coin2TokenAmount = toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true })
        const unslippagedCoin1TokenAmount = toTokenAmount(coin1, unslippagedCoin1Amount ?? coin1Amount, {
          alreadyDecimaled: true
        })
        const unslippagedCoin2TokenAmount = toTokenAmount(coin2, unslippagedCoin2Amount ?? coin2Amount, {
          alreadyDecimaled: true
        })
        assert(
          checkWalletHasEnoughBalance(focusSide === 'coin1' ? coin1TokenAmount : unslippagedCoin1TokenAmount),
          `not enough ${coin1.symbol}`
        )
        assert(
          checkWalletHasEnoughBalance(focusSide === 'coin2' ? coin2TokenAmount : unslippagedCoin2TokenAmount),
          `not enough ${coin2.symbol}`
        )
        const tokenXMint = new PublicKey(currentPoolInfo.baseMint)
        const tokenYMint = new PublicKey(currentPoolInfo.quoteMint)
        const tokenXVault = new PublicKey(currentPoolInfo.baseVault)
        const tokenYVault = new PublicKey(currentPoolInfo.quoteVault)
        const poolMint = new PublicKey(currentPoolInfo.lpMint)
        const poolAuthority = new PublicKey(currentPoolInfo.authority)
        const instructions: TransactionInstruction[] = []
        const [userLpVault, isInitialized] = await findAssociatedTokenAddress(owner, poolMint, connection)
        if (!isInitialized) {
          instructions.push(
            Token.createAssociatedTokenAccountInstruction(
              ASSOCIATED_TOKEN_PROGRAM_ID,
              TOKEN_PROGRAM_ID,
              poolMint,
              userLpVault,
              owner,
              owner
            )
          )
        }

        const [config] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(CONFIG_PDA_SEED),
            Buffer.from(currentPoolInfo.pair),
            new PublicKey(currentPoolInfo.baseMint).toBuffer(),
            new PublicKey(currentPoolInfo.quoteMint).toBuffer()
          ],
          program.programId
        )
        const tx_hash = await program.methods
          .depositLiquidity(currentPoolInfo.pair, coin1TokenAmount.raw, coin2TokenAmount.raw, slippage)
          .accounts({
            owner: owner,
            config: config,
            tokenXMint: tokenXMint,
            tokenYMint: tokenYMint,
            tokenXVault: tokenXVault,
            tokenYVault: tokenYVault,
            poolMint: poolMint,
            poolAuthority: poolAuthority,
            userTokenXVault: getTokenAccount(coin1TokenAmount.token)?.publicKey,
            userTokenYVault: getTokenAccount(coin2TokenAmount.token)?.publicKey,
            userLpVault: userLpVault,
            tokenProgram: TOKEN_PROGRAM_ID
          })
          .preInstructions(instructions)
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
