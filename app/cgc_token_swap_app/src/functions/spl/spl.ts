import { ASSOCIATED_TOKEN_PROGRAM_ID, Token as _Token, TOKEN_PROGRAM_ID, u64 as _u64 } from '@solana/spl-token'
import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js'
import BN from 'bn.js'
import { u64 } from '../marshmallow'

import { SPL_ACCOUNT_LAYOUT } from './layout'

// https://github.com/solana-labs/solana-program-library/tree/master/token/js/client
export class Spl {
  static getAssociatedTokenAccount({ mint, owner }: { mint: PublicKey; owner: PublicKey }) {
    return _Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, owner, true)
  }
}
