import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import * as anchor from '@project-serum/anchor'
import idl from '@/idl/swap.json'
import market from '@/json/market.json'
import { Address } from '@project-serum/anchor'
import useProgram from '@/application/program/useProgram'

export default function useProgramInitialization({ disabled }: { disabled?: boolean } = {}) {
  const connection = useConnection((s) => s.connection)
  const { owner, signTransaction, signAllTransactions } = useWallet()

  useAsyncEffect(async () => {
    if (disabled) return
    if (connection && owner && signTransaction && signAllTransactions) {
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: owner,
          signTransaction: signTransaction,
          signAllTransactions: signAllTransactions
        },
        {
          preflightCommitment: 'recent',
          commitment: 'processed'
        }
      )
      const program = new anchor.Program(idl as any, market['programId'] as Address, provider)
      if (program) {
        useProgram.setState({
          program: program
        })
      }
    }
  }, [disabled, connection, owner])
}
