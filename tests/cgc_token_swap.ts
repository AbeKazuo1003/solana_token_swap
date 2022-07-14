import * as anchor from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
import { CgcTokenSwap } from "../target/types/cgc_token_swap";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as token from "@solana/spl-token";
import { assert, config } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.CgcTokenSwap as Program<CgcTokenSwap>;
const connection = provider.connection;

const CONFIG_PDA_SEED = "config";
const POOL_AUTHORITY_SEED = "pool_authority";
const POOL_MINT_SEED = "pool_mint";
const TOKEN_VAULT_PDA_SEED = "token_vault";

interface Pool {
  payer: Keypair;
  config: PublicKey;
  poolMint: PublicKey;
  poolAuthority: PublicKey;
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  tokenXVault: PublicKey;
  tokenYVault: PublicKey;
}

interface LP_Provider {
  signer?: Keypair;
  token_x_wallet: PublicKey;
  token_y_wallet: PublicKey;
  pool_wallet: PublicKey;
}

describe("cgc_token_swap", () => {
  let pair = "CHICKS-SHARDS";
  let pool: Pool;
  let n_decimals = 9;

  let owner: anchor.web3.Keypair;

  it("1. Set Up", async () => {
    owner = web3.Keypair.generate();
    let sig = await connection.requestAirdrop(
      owner.publicKey,
      100 * web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig);

    let mint_x = await token.createMint(
      connection,
      owner,
      owner.publicKey,
      owner.publicKey,
      n_decimals
    );
    let mint_y = await token.createMint(
      connection,
      owner,
      owner.publicKey,
      owner.publicKey,
      n_decimals
    );

    let [config, config_b] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from(CONFIG_PDA_SEED),
        Buffer.from(pair),
        mint_x.toBuffer(),
        mint_y.toBuffer(),
      ],
      program.programId
    );

    let [pool_authority, pool_authority_b] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(POOL_AUTHORITY_SEED),
          Buffer.from(pair),
          config.toBuffer(),
        ],
        program.programId
      );

    let [token_x_vault, token_x_vault_b] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(TOKEN_VAULT_PDA_SEED),
          Buffer.from(pair),
          mint_x.toBuffer(),
          config.toBuffer(),
        ],
        program.programId
      );

    let [token_y_vault, token_y_vault_b] =
      await web3.PublicKey.findProgramAddress(
        [
          Buffer.from(TOKEN_VAULT_PDA_SEED),
          Buffer.from(pair),
          mint_y.toBuffer(),
          config.toBuffer(),
        ],
        program.programId
      );

    let [pool_mint, pool_mint_b] = await web3.PublicKey.findProgramAddress(
      [Buffer.from(POOL_MINT_SEED), Buffer.from(pair), config.toBuffer()],
      program.programId
    );

    //  25/10K = 0.25% fees
    let fee_numerator = new anchor.BN(25);
    let fee_denominator = new anchor.BN(10000);

    await program.methods
      .setup(pair, config_b, fee_numerator, fee_denominator)
      .accounts({
        owner: provider.wallet.publicKey,
        config: config,
        tokenXMint: mint_x,
        tokenYMint: mint_y,
        poolAuthority: pool_authority,
        tokenXVault: token_x_vault,
        tokenYVault: token_y_vault,
        poolMint: pool_mint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: token.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    pool = {
      config: config,
      tokenXMint: mint_x,
      tokenYMint: mint_y,
      tokenXVault: token_x_vault,
      tokenYVault: token_y_vault,
      poolMint: pool_mint,
      poolAuthority: pool_authority,
      payer: owner,
    };
    const config_fetch = await program.account.config.fetch(config);
    console.log("Owner: ", config_fetch.owner.toString());
  });

  // helper function
  async function setup_LP_provider(lp_user: PublicKey, amount: number) {
    let mint_x_ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.tokenXMint,
      lp_user
    );
    let mint_y_ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.tokenYMint,
      lp_user
    );

    // setup token account for LP pool Tokens
    let pool_mint_ata = await token.createAssociatedTokenAccount(
      connection,
      pool.payer,
      pool.poolMint,
      lp_user
    );

    // setup initial balance for LP Pool Tokens
    await token.mintTo(
      connection,
      pool.payer,
      pool.tokenXMint,
      mint_x_ata,
      pool.payer,
      amount * 10 ** n_decimals
    );
    await token.mintTo(
      connection,
      pool.payer,
      pool.tokenYMint,
      mint_y_ata,
      pool.payer,
      amount * 10 ** n_decimals
    );
    return [mint_x_ata, mint_y_ata, pool_mint_ata];
  }

  async function get_token_balance(wallet: PublicKey) {
    return (await connection.getTokenAccountBalance(wallet)).value.uiAmount;
  }

  function lp_amount(amount: number) {
    return new anchor.BN(amount * 10 ** n_decimals);
  }

  let owner_provider: LP_Provider;
  it("2. Owner init Pool", async () => {
    let owner_signer = provider.wallet;
    let owner_lp = owner_signer.publicKey;
    let [owner_x_wallet, owner_y_wallet, owner_pool_wallet] =
      await setup_LP_provider(owner_lp, 100);
    owner_provider = {
      token_x_wallet: owner_x_wallet,
      token_y_wallet: owner_y_wallet,
      pool_wallet: owner_pool_wallet,
    };
    let [owner_x_amount, owner_y_amount] = [lp_amount(100), lp_amount(100)];
    await program.methods
      .initPool(pair, owner_x_amount, owner_y_amount)
      .accounts({
        owner: provider.wallet.publicKey,
        config: pool.config,
        tokenXMint: pool.tokenXMint,
        tokenYMint: pool.tokenYMint,
        poolAuthority: pool.poolAuthority,
        tokenXVault: pool.tokenXVault,
        tokenYVault: pool.tokenYVault,
        poolMint: pool.poolMint,
        userTokenXVault: owner_x_wallet,
        userTokenYVault: owner_y_wallet,
        userLpVault: owner_pool_wallet,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    //initialize pool Liquidity
    let owner_pool_balance = await get_token_balance(owner_pool_wallet);
    let fetch_config = await program.account.config.fetch(pool.config);
    let amount_total_mint = fetch_config.totalAmountMinted.toNumber();

    console.log("Owner Pool Balance: ", owner_pool_balance);
    console.log("Total amount mint", amount_total_mint);

    assert(owner_pool_balance > 0);

    // ensure vault
    let token_x_vault_balance = await get_token_balance(pool.tokenXVault);
    let token_y_vault_balance = await get_token_balance(pool.tokenYVault);

    console.log(token_x_vault_balance);
    console.log(token_y_vault_balance);

    assert(token_x_vault_balance > 0);
    assert(token_y_vault_balance > 0);

    assert(token_x_vault_balance == token_y_vault_balance); // 1 : 1
  });

  let LP_user_provider: LP_Provider;
  it("3. Add deposit Liquidity by normal User", async () => {
    let lp_user_singer = web3.Keypair.generate();
    let lp_user = lp_user_singer.publicKey;
    let [user_token_x_wallet, user_token_y_wallet, user_pool_wallet] =
      await setup_LP_provider(lp_user, 100);

    LP_user_provider = {
      signer: lp_user_singer,
      token_x_wallet: user_token_x_wallet,
      token_y_wallet: user_token_y_wallet,
      pool_wallet: user_pool_wallet,
    };

    let [user_x_amount, user_y_amount] = [lp_amount(25), lp_amount(100)];

    await program.methods
      .depositLiquidity(pair, user_x_amount, user_y_amount, 1)
      .accounts({
        owner: LP_user_provider.signer.publicKey,
        config: pool.config,
        tokenXMint: pool.tokenXMint,
        tokenYMint: pool.tokenYMint,
        poolAuthority: pool.poolAuthority,
        tokenXVault: pool.tokenXVault,
        tokenYVault: pool.tokenYVault,
        poolMint: pool.poolMint,
        userTokenXVault: user_token_x_wallet,
        userTokenYVault: user_token_y_wallet,
        userLpVault: user_pool_wallet,
        tokenProgram: token.TOKEN_PROGRAM_ID,
      })
      .signers([LP_user_provider.signer])
      .rpc();

    let user_pool_balance = await get_token_balance(user_pool_wallet);
    let fetch_config = await program.account.config.fetch(pool.config);
    let amountTotalMint = fetch_config.totalAmountMinted.toNumber();

    console.log("LP User Pool Balance: ", user_pool_balance);
    console.log("Total amount mint: ", amountTotalMint);

    assert(user_pool_balance > 0);
  });
});
