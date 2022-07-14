import useProgram, { CONFIG_PDA_SEED } from '@/application/program/useProgram'
import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import { noTailingPeriod } from '@/functions/format/noTailingPeriod'
import assert from '@/functions/assert'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useToken from '@/application/token/useToken'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKey } from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

type FinalInfo = {
  allSuccess: boolean
  txid: string
}

export default function txRemoveLiquidity(): Promise<FinalInfo> {
  return new Promise((resolve, reject) =>
    (async () => {
      console.log('Test')
      const isApprovePanelShown = useAppSettings.getState().isApprovePanelShown
      if (isApprovePanelShown) return
      const program = useProgram.getState().program
      const connection = useConnection.getState().connection
      const { owner, getTokenAccount } = useWallet.getState()
      const { getToken } = useToken.getState()
      const { coin1, coin2, currentPoolInfo, removeAmount } = useLiquidity.getState()
      useAppSettings.setState({ isApprovePanelShown: true })
      try {
        assert(removeAmount, 'user have not input amount to remove lp')
        assert(connection, 'no rpc connection')
        assert(program, 'market not found')
        assert(owner, 'wallet not found')
        assert(currentPoolInfo, `can't find liquidity pool`)
        assert(coin1, 'select a coin in upper box')
        assert(coin2, 'select a coin in lower box')
        const baseToken = getToken(currentPoolInfo.baseMint)
        assert(baseToken, `can't find base token in tokenList`)
        const quoteToken = getToken(currentPoolInfo.quoteMint)
        assert(quoteToken, `can't find quote token in tokenList`)
        const lpToken = getToken(currentPoolInfo.lpMint)
        assert(lpToken, `can't find lp token in tokenList`)
        const baseTokenAccount = getTokenAccount(currentPoolInfo.baseMint)
        const quoteTokenAccount = getTokenAccount(currentPoolInfo.quoteMint)
        const lpTokenAccount = getTokenAccount(currentPoolInfo.lpMint)
        const removeTokenAmount = toTokenAmount(lpToken, removeAmount, { alreadyDecimaled: true })
        assert(baseTokenAccount?.publicKey, `user haven't base token's account`)
        assert(quoteTokenAccount?.publicKey, `user haven't quote token's account`)
        assert(lpTokenAccount?.publicKey, `user haven't liquidity pool's account`)

        const tokenXMint = new PublicKey(currentPoolInfo.baseMint)
        const tokenYMint = new PublicKey(currentPoolInfo.quoteMint)
        const tokenXVault = new PublicKey(currentPoolInfo.baseVault)
        const tokenYVault = new PublicKey(currentPoolInfo.quoteVault)
        const poolMint = new PublicKey(currentPoolInfo.lpMint)
        const poolAuthority = new PublicKey(currentPoolInfo.authority)
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
          .withdrawLiquidity(currentPoolInfo.pair, removeTokenAmount.raw)
          .accounts({
            owner: owner,
            config: config,
            tokenXMint: tokenXMint,
            tokenYMint: tokenYMint,
            tokenXVault: tokenXVault,
            tokenYVault: tokenYVault,
            poolMint: poolMint,
            poolAuthority: poolAuthority,
            userTokenXVault: baseTokenAccount.publicKey,
            userTokenYVault: quoteTokenAccount.publicKey,
            userLpVault: lpTokenAccount.publicKey,
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
