import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, CpmmRpcData, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from './swapConfig'
import BN from 'bn.js'
import { isValidCpmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'
import { Connection, Keypair, clusterApiUrl, Signer, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { web3, Wallet } from "@project-serum/anchor";
import bs58 from 'bs58'
import * as splToken from "@solana/spl-token";
import solanaWeb3 from '@solana/web3.js';
import mongoose from 'mongoose';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rpcUrl = process.env.RPC_URL as string;

var connection = new Connection(rpcUrl, "finalized");
mongoose.connect(process.env.MONGODB_URI as string);

const masterWalletPrivKey = process.env.PRIVATE_KEY as string;

//@ts-ignore
var volume;
export const swapNARAtoSOL = async (input: string, privKey: string, convertToLamports: boolean) => {
    try {
        const raydium = await initSdk(privKey)

        // SOL - NARA pool
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        const inputAmountinSOL = new BN(input)
        const lamports = new BN(1000000000)
        let inputAmount;
        if(convertToLamports) {
            inputAmount = inputAmountinSOL.mul(lamports)
        } else {
            inputAmount = inputAmountinSOL
        }

        
        const inputMint = "2u9ZQVaSTVxCBVoyw75QioxivBnhLkCsJzvFTR8oGjAH" 
      
        let poolInfo: ApiV3PoolInfoStandardItemCpmm
        let poolKeys: CpmmKeys | undefined
        let rpcData: CpmmRpcData
      
        if (raydium.cluster === 'mainnet') {
            const data = await raydium.api.fetchPoolById({ ids: poolId })
            poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
            if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
            rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
        } else {
            const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
            poolInfo = data.poolInfo
            poolKeys = data.poolKeys
            rpcData = data.rpcData
        }
      
        if (inputMint !== poolInfo.mintA.address && inputMint !== poolInfo.mintB.address)
            throw new Error('input mint does not match pool')
      
        const baseIn = inputMint === poolInfo.mintA.address
      
        // swap pool mintA for mintB
        const swapResult = CurveCalculator.swap(
            inputAmount,
            baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
            baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
            rpcData.configInfo!.tradeFeeRate
        )

        console.log(swapResult.destinationAmountSwapped.toString(), "++++++++++++")
      
        const { execute } = await raydium.cpmm.swap({
            poolInfo,
            poolKeys,
            inputAmount,
            swapResult,
            slippage: 0.001,
            baseIn,
            computeBudgetConfig: {
                units: 710000,
                microLamports: 5859150,
            },
        })
      
        // printSimulateInfo()
        const { txId } = await execute({ sendAndConfirm: true })
        console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, {
            txId: `https://explorer.solana.com/tx/${txId}`,
        })

        const returnData = {
            amount: swapResult.destinationAmountSwapped.toString(),
            volume: poolInfo.day,
        }

        return returnData

        // return swapResult.destinationAmountSwapped.toString();

    } catch (error) {
        console.error(error)
    }
}

async function swapSOLtoNARA(output: string, privKey: string, convertToLamports: boolean) {
    try {
        const raydium = await initSdk(privKey)

        console.log("Swapping SOL to NARA", output);

        // SOL - NARA pool
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        const inputAmountinSOL = new BN(output)
        const lamports = new BN(1000000000)
        let outputAmount;
        if(convertToLamports) {
            outputAmount = inputAmountinSOL.mul(lamports)
        } else {
            outputAmount = inputAmountinSOL
        }
        const outputMint = '2u9ZQVaSTVxCBVoyw75QioxivBnhLkCsJzvFTR8oGjAH'
      
        let poolInfo: ApiV3PoolInfoStandardItemCpmm
        let poolKeys: CpmmKeys | undefined
        let rpcData: CpmmRpcData
      
        if (raydium.cluster === 'mainnet') {
            const data = await raydium.api.fetchPoolById({ ids: poolId })
            poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
            if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
            rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
        } else {
            const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
            poolInfo = data.poolInfo
            poolKeys = data.poolKeys
            rpcData = data.rpcData
        }
      
        if (outputMint !== poolInfo.mintA.address && outputMint !== poolInfo.mintB.address)
            throw new Error('input mint does not match pool')
      
        const baseIn = outputMint === poolInfo.mintB.address
      
        // swap pool mintA for mintB
        const swapResult = CurveCalculator.swapBaseOut({
            poolMintA: poolInfo.mintA,
            poolMintB: poolInfo.mintB,
            tradeFeeRate: rpcData.configInfo!.tradeFeeRate,
            baseReserve: rpcData.baseReserve,
            quoteReserve: rpcData.quoteReserve,
            outputMint,
            outputAmount,
        })
      
        const { execute, transaction } = await raydium.cpmm.swap({
            poolInfo,
            poolKeys,
            inputAmount: new BN(0), // if set fixedOut to true, this arguments won't be used
            fixedOut: true,
            swapResult: {
              sourceAmountSwapped: swapResult.amountIn,
              destinationAmountSwapped: outputAmount,
            },
            slippage: 0.001,
            baseIn,
            txVersion,
            // optional: set up priority fee here
            computeBudgetConfig: {
              units: 600000,
              microLamports: 465915,
            },
          })
      
        const { txId } = await execute({ sendAndConfirm: true })
        console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, {
        txId: `https://explorer.solana.com/tx/${txId}`,
        })

        const returnData = {
            amount: swapResult.amountRealOut.toString(),
            volume: poolInfo.day,
        }

        return returnData

    } catch (error) {
        console.error(error)
    }
}

async function transferSOL(fromPrivKey: string, to: string, amount: number){
    try {
        console.log("Transferring SOL to", to, "Amount:", amount);
        console.log("fromPrivKey", fromPrivKey, typeof fromPrivKey)

        // const connection = new Connection('https://api.mainnet-beta.solana.com', "confirmed")
        const owner = Keypair.fromSecretKey(bs58.decode((fromPrivKey as string)))  
        const fromWallet = new Wallet(owner)

        const destPublicKey = new PublicKey(to);
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: destPublicKey,
                lamports: amount,
            })
        );

        transaction.feePayer = fromWallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        await transaction.sign(fromWallet.payer);

        const txId = await connection.sendTransaction(transaction, [fromWallet.payer], { skipPreflight: false });
        console.log("Transaction Signature:", txId);        

        await connection.confirmTransaction(txId);

        console.log("Transfer complete");
    } catch (error) {
        console.log(error);
    }
}

async function transferNARA(NARAMintAddress: string, fromPrivKey: string, toAddress: string, amount: any){
    try {
        console.log("transfering token");
        const mintPublicKey = new web3.PublicKey(NARAMintAddress);  
        const {TOKEN_PROGRAM_ID} = splToken

        // const connection = new Connection('https://api.mainnet-beta.solana.com', "confirmed")
        const owner = Keypair.fromSecretKey(bs58.decode((fromPrivKey as string)))  
        const fromWallet = new Wallet(owner)
      
        const fromTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          fromWallet.payer,
          mintPublicKey,
          fromWallet.publicKey
        );
      
        const destPublicKey = new web3.PublicKey(toAddress);  
        const associatedDestinationTokenAddr = await splToken.getOrCreateAssociatedTokenAccount(
          connection,
          fromWallet.payer,
          mintPublicKey,
          destPublicKey
        );
      
        const receiverAccount = await connection.getAccountInfo(associatedDestinationTokenAddr.address); 
        
        const instructions: web3.TransactionInstruction[] = [];   
        
        instructions.push(
          splToken.createTransferInstruction(
            fromTokenAccount.address,
            associatedDestinationTokenAddr.address,
            fromWallet.publicKey,
            amount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      
        const transaction = new web3.Transaction().add(...instructions); 
  
        const sign: Signer[] = [fromWallet.payer];
  
        transaction.feePayer = fromWallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        
        transaction.sign(...sign);
        
        const txId = await connection.sendRawTransaction(
          transaction.serialize(),
          { skipPreflight: false }
        );
    
        console.log("transactionSignature", txId);
      
        await connection.confirmTransaction(txId);
    
        console.log("transfer complete");
      } catch (error) {
        console.log(error);
      }    
}

async function generateWallet() {
    const keypair = solanaWeb3.Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = Array.from(keypair.secretKey);
     
    const secretKeyBase58 = bs58.encode(keypair.secretKey);
    const walletData = {
      publicKey,
      secretKey: {
        base58: secretKeyBase58,
      },
      createdAt: new Date()
    };
    

      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('solanaWallets').insertOne(walletData);
      } else {
        throw new Error('Database connection is not established');
      }

    return walletData;
  }

async function generateRandomWallets(count: number): Promise<string[]> {
    const wallets = [];
    for (let i = 0; i < count; i++) {
        const wallet = await generateWallet();
        wallets.push(wallet);
    }
    //@ts-ignore
    return wallets;
}

export const distributeTokens = async (
    privateKey: string, 
    isNaraToSol: boolean = true,
    maxVolume: number,
    minWallets: number,
    maxWallets: number,
    minLot: number,
    maxLot: number,
    minInterval: number,
    maxInterval: number,
    convertToLamports: boolean
): Promise<void> => {
    //@ts-ignore
    if(volume > 2) {
        console.log("max volume reached");
        return
    };

    let amount = Math.floor(Math.random() * (maxLot - minLot) + minLot);
    const walletsCount = Math.floor(Math.random() * (maxWallets - minWallets) + minWallets);
    const interval = Math.floor(Math.random() * (maxInterval - minInterval) + minInterval);

    
    try {
        await delay(interval * 1000);
        
        const swapResult = isNaraToSol 
            ? await swapNARAtoSOL(amount.toString(), privateKey, convertToLamports) 
            : await swapSOLtoNARA(amount.toString(), privateKey, convertToLamports);

            console.log(swapResult, "swapResult")
        if (!swapResult) throw new Error(`Failed to swap ${isNaraToSol ? 'NARA to SOL' : 'SOL to NARA'}`);
        if (typeof swapResult === 'string') {
            throw new Error(`Unexpected swap result: ${swapResult}`);
        }
        const swappedAmount = parseFloat(swapResult.amount);


        //@ts-ignore
        volume = swapResult.volume.volume;

        console.log(`Distributing ${swappedAmount} tokens...`);

        const keepPercentage = Math.random() * 0.02 + 0.01; // 1-3%
        const keepAmount = swappedAmount * keepPercentage;
        const distributeAmount = swappedAmount - keepAmount;

        const newWallets = await generateRandomWallets(walletsCount);

        const distributionShares = Array.from({ length: walletsCount }, () => Math.random());

        const totalShare = distributionShares.reduce((a, b) => a + b, 0);

        console.log(`Distributing ${distributeAmount} tokens to ${walletsCount} wallets...`);
        // console.log("Distribution shares:", distributionShares);

        for (let i = 0; i < newWallets.length; i++) {
            const wallet = newWallets[i];
            const walletShare = distributionShares[i] / totalShare;
            let walletAmount = Math.floor(distributeAmount * walletShare);

            //calculate rent amount needed in new wallet
            const rentAmount = await connection.getMinimumBalanceForRentExemption(165);

            let finalAmount = walletAmount + rentAmount + 14830000;

            await delay(10000);

            if (isNaraToSol) {
                //@ts-ignore
                await transferSOL(privateKey, wallet.publicKey, finalAmount.toString());
            } else {
                 // Transfer SOL to new wallet for gas
                 //@ts-ignore
                await transferSOL(masterWalletPrivKey, wallet.publicKey, rentAmount + 34830000);

                await transferNARA(
                    "2u9ZQVaSTVxCBVoyw75QioxivBnhLkCsJzvFTR8oGjAH", 
                    privateKey, 
                    //@ts-ignore
                    wallet.publicKey, 
                    walletAmount
                );
            }

            // need to optimize more, recursive calling not good for many cycles
            await distributeTokens(
            //@ts-ignore
                wallet.secretKey.base58, 
                !isNaraToSol, 
                maxVolume, 
                minWallets, 
                maxWallets,
                walletAmount,
                walletAmount,
                minInterval,
                maxInterval,
                false
                );

            await delay(10000);
        }
    } catch (error) {
        console.error(`Distribution error:`, error);
    }
}