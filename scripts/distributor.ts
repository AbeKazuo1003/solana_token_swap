import * as anchor from "@project-serum/anchor";
import { program } from "commander";
import { loadWallet, lp_amount } from "./utils";
import * as fs from "fs";
import { AnchorProvider, Program, web3 } from "@project-serum/anchor";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { IDL, CgcTokenSwap } from "../target/types/cgc_token_swap";
import * as token from "@solana/spl-token";

interface Pool {
  config: PublicKey;
  poolMint: PublicKey;
  poolAuthority: PublicKey;
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  tokenXVault: PublicKey;
  tokenYVault: PublicKey;
}

program.version("0.0.1");
program
  .command("open_pool")
  .requiredOption("-k, --keypair <path>", `Solana Wallet Location`)
  .requiredOption("-c, --config <path>", "Program Config Location")
  .option(
    "-e, --env <string>",
    `Solana cluster env name. One of: mainnet-beta, testnet, devnet`,
    "devnet"
  )
  .action(async (_directory: any, cmd: any) => {
    const { keypair, config, env } = cmd.opts();
    const CONFIG_PDA_SEED = "config";
    const POOL_AUTHORITY_SEED = "pool_authority";
    const POOL_MINT_SEED = "pool_mint";
    const TOKEN_VAULT_PDA_SEED = "token_vault";

    console.log("Step1: Load Program Owner");
    const serviceKeyPair = loadWallet(keypair);
    console.log("Step 2: Load Config");
    let configFile = fs.readFileSync(config, "utf-8");
    const setting = JSON.parse(configFile);
    console.log("Step 3: Prepare");
    const provideOptions = AnchorProvider.defaultOptions();
    const connection = new Connection(
      clusterApiUrl(env),
      provideOptions.commitment
    );
    const walletWrapper = new anchor.Wallet(serviceKeyPair);
    const provider = new AnchorProvider(connection, walletWrapper, {
      preflightCommitment: "confirmed",
    });
    const programId = new anchor.web3.PublicKey(setting["program"]);
    const program = new Program<CgcTokenSwap>(IDL, programId, provider);

    console.log("Step 4: Open Pools");
    for (let i = 0; i < setting["pools"].length; i++) {
      let poolSetting = setting["pools"][i];
      let swapRate = poolSetting["swapRate"];
      let lp_decimal = poolSetting["lp_decimals"];
      let pair = poolSetting["pair"];
      let pool: Pool;
      let mint_x = new PublicKey(poolSetting["tokenXMint"]);
      let mint_y = new PublicKey(poolSetting["tokenYMint"]);
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
          owner: serviceKeyPair.publicKey,
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
        .signers([serviceKeyPair])
        .rpc();
      pool = {
        config: config,
        tokenXMint: mint_x,
        tokenYMint: mint_y,
        tokenXVault: token_x_vault,
        tokenYVault: token_y_vault,
        poolAuthority: pool_authority,
        poolMint: pool_mint,
      };
      console.log("------- Pool Info START -----------");
      console.log("Token Pair: ", pair);
      console.log("Token X Mint: ", mint_x.toString());
      console.log("Token Y Mint: ", mint_y.toString());
      console.log("Token X Vault: ", token_x_vault.toString());
      console.log("Token Y Vault: ", token_y_vault.toString());
      console.log("LP Mint: ", pool_mint.toString());
      console.log("LP Authority: ", pool_authority.toString());
      console.log("------- Pool Info END -----------");

      let deposit_x = poolSetting["init_deposit"];
      let deposit_y = deposit_x * swapRate;

      let token_x_wallet = await token.getAssociatedTokenAddress(
        pool.tokenXMint,
        serviceKeyPair.publicKey
      );
      let token_y_wallet = await token.getAssociatedTokenAddress(
        pool.tokenYMint,
        serviceKeyPair.publicKey
      );
      let pool_wallet = await token.createAssociatedTokenAccount(
        connection,
        serviceKeyPair,
        pool.poolMint,
        serviceKeyPair.publicKey
      );

      let [owner_x_amount, owner_y_amount] = [
        lp_amount(deposit_x, lp_decimal),
        lp_amount(deposit_y, lp_decimal),
      ];

      await program.methods
        .initPool(pair, owner_x_amount, owner_y_amount)
        .accounts({
          owner: serviceKeyPair.publicKey,
          config: pool.config,
          tokenXMint: pool.tokenXMint,
          tokenYMint: pool.tokenYMint,
          poolAuthority: pool.poolAuthority,
          tokenXVault: pool.tokenXVault,
          tokenYVault: pool.tokenYVault,
          poolMint: pool.poolMint,
          userTokenXVault: token_x_wallet,
          userTokenYVault: token_y_wallet,
          userLpVault: pool_wallet,
          tokenProgram: token.TOKEN_PROGRAM_ID,
        })
        .signers([serviceKeyPair])
        .rpc();
    }
    console.log("Step 4: Success!");
  });
program.parse(process.argv);
