import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { ITokenAccount } from '../type'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Spl, SPL_ACCOUNT_LAYOUT } from '@/functions/spl'
import toPubString, { toPub } from '@/functions/format/toMintString'

export async function getWalletTokenAccounts({
  connection,
  owner,
  filter
}: {
  connection: Connection
  owner: PublicKey
  filter?: PublicKey[]
}): Promise<{ accounts: ITokenAccount[] }> {
  const solReq = connection.getAccountInfo(owner)
  const tokenReq = connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
  const [solResp, tokenResp] = await Promise.all([solReq, tokenReq])
  const accounts: ITokenAccount[] = []
  for (const { pubkey, account } of tokenResp.value) {
    const rawResult = SPL_ACCOUNT_LAYOUT.decode(account.data)
    const { mint, amount } = rawResult
    if (filter && filter.findIndex((item) => toPubString(item) === toPubString(mint)) == -1) continue
    const associatedTokenAddress = await Spl.getAssociatedTokenAccount({ mint, owner })

    accounts.push({
      publicKey: pubkey,
      mint,
      isAssociated: associatedTokenAddress.equals(pubkey),
      amount,
      isNative: false
    })
  }

  if (solResp) {
    accounts.push({
      amount: new BN(solResp.lamports),
      isNative: true
    })
  }

  return { accounts }
}
