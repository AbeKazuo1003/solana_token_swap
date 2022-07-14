import { Commitment, Connection, PublicKey } from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'
import { AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'

export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2
}

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const handleLink = (href: string) => {
  window.open(href, '_blank')
}

export const consoleHelper = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === `production`) return
  // console.log(...args);
}
export const get_token_balance = async (connection: Connection, wallet: PublicKey) => {
  return (await connection.getTokenAccountBalance(wallet)).value.uiAmount
}

export const lp_amount = (amount: number, decimal: number) => {
  return new anchor.BN(amount * 10 ** decimal)
}

export const findAssociatedTokenAddress = async (
  wallet: PublicKey,
  tokenMintAddress: PublicKey,
  connection: Connection
): Promise<[PublicKey, boolean]> => {
  const acc = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenMintAddress,
    wallet,
    false
  )
  try {
    const account_info = await getAccountInfo(connection, acc)
    return [acc, account_info.isInitialized]
  } catch (e) {
    return [acc, false]
  }
}

export async function getAccountInfo(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
) {
  const info = await connection.getAccountInfo(address, commitment)
  if (!info) throw new Error('TokenAccountNotFoundError')
  if (!info.owner.equals(programId)) throw new Error('TokenInvalidAccountOwnerError')
  if (info.data.length != AccountLayout.span) throw new Error('TokenInvalidAccountSizeError')

  const rawAccount = AccountLayout.decode(Buffer.from(info.data))

  return {
    address,
    mint: rawAccount.mint,
    owner: rawAccount.owner,
    amount: rawAccount.amount,
    delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
    delegatedAmount: rawAccount.delegatedAmount,
    isInitialized: rawAccount.state !== AccountState.Uninitialized,
    isFrozen: rawAccount.state === AccountState.Frozen,
    isNative: !!rawAccount.isNativeOption,
    rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
    closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null
  }
}
