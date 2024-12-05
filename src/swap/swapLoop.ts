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

export const swapNARAtoSOL = async (input: string, privKey: string) => {
    try {
        const raydium = await initSdk(privKey)

        console.log("Swapping NARA to SOL", input);

        // SOL - NARA pool
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        // const inputAmount = new BN('2000000000000000')
        const inputAmount = new BN(input)
        const inputMint = "2u9ZQVaSTVxCBVoyw75QioxivBnhLkCsJzvFTR8oGjAH" //NARA
      
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

        console.log(poolInfo.day.volume, "======================")

      
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

        return swapResult.destinationAmountSwapped.toString();

    } catch (error) {
        console.error(error)
    }
}

export const swapSOLtoNARA = async (input: string, privKey: string) => {
    try {
        const raydium = await initSdk(privKey)
        console.log("Swapping SOL to NARA", input);

        // SOL - NARA pool
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        const inputAmount = new BN(input)
        
        const inputMint = NATIVE_MINT.toBase58()
      
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

        return swapResult.destinationAmountSwapped.toString();

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

        transaction.sign(fromWallet.payer);

        const txId = await connection.sendTransaction(transaction, [fromWallet.payer], { skipPreflight: false });
        console.log("Transaction Signature:", txId);        

        await connection.confirmTransaction(txId);
        return true;

    } catch (error) {
        console.log(error);
        return false;
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
        return true;
    
      } catch (error) {
        console.log(error);
        return false;
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

async function generateRandomWallets(count: number): Promise<{ publicKey: string; secretKey: { base58: string } }[]> {
    const wallets = [];
    for (let i = 0; i < count; i++) {
        const wallet = await generateWallet();
        wallets.push(wallet);
    }
    return wallets;
}

export const getCurrentVolume = async () => {
    try {
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        const raydium = await initSdk(masterWalletPrivKey)
        const data = await raydium.api.fetchPoolById({ ids: poolId })

        const poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
        const volume: number = poolInfo.day.volume
        console.log("Current Volume:", volume);

        if(!volume) return 0.1;

        return volume as number;

    } catch (error) {
        console.log(error);
        return null;
    }
}

export const distributeTokensV3 = async (
    privateKey: string, 
    isNaraToSol: boolean = false,
    maxVolume: number,
    amount: number,
    minWallets: number,
    maxWallets: number,
): Promise<void> => {
    try {
        const currentVolume = await getCurrentVolume();
        if (!currentVolume || currentVolume > maxVolume) {
            console.log("Max volume reached");
            return;
        }

        const walletQueue = [{ privateKey, isNaraToSol, amount }];
        
        while (walletQueue.length > 0) {
            if (!currentVolume || currentVolume > maxVolume) {
                console.log("Max volume reached");
                return;
            }
            const current = walletQueue.shift(); 
            //@ts-ignore
            const { privateKey, isNaraToSol, amount } = current;

            console.log(`Swapping ${amount} ${isNaraToSol ? 'NARA to SOL' : 'SOL to NARA'}`);
            const swapResult = isNaraToSol 
                ? await swapNARAtoSOL(amount.toString(), privateKey) 
                : await swapSOLtoNARA(amount.toString(), privateKey);

            if (!swapResult && walletQueue.length == 1) throw new Error(`Failed to swap ${isNaraToSol ? 'NARA to SOL' : 'SOL to NARA'}`);
            if(!swapResult && walletQueue.length > 1) continue;

            const swappedAmount = amount;

            const keepPercentage = Math.random() * 0.02 + 0.01; // 1-3%
            const keepAmount = swappedAmount * keepPercentage;

            const distributeAmount = swappedAmount - keepAmount;

            const walletsCount = Math.floor(Math.random() * (maxWallets - minWallets + 1)) + minWallets;
            const newWallets = await generateRandomWallets(walletsCount);
            
            const distributionShares = Array.from({ length: walletsCount }, () => Math.random());
            const totalShare = distributionShares.reduce((a, b) => a + b, 0);

            for (let i = 0; i < newWallets.length; i++) {
                const wallet = newWallets[i];
                const rentAmount = await connection.getMinimumBalanceForRentExemption(165);

                let walletShareSOL = 0;
                let walletShareNARA = 0;
                
                // If isNaraToSol, SOL needs to be transferred to the new wallet; else NARA needs to be transferred
                if (isNaraToSol) {
                    walletShareSOL = Math.floor(distributeAmount * (distributionShares[i] / totalShare));
                    const rentAndGas = walletShareSOL + rentAmount + 5175000; // Add rent and gas
                    //also need to transfer rent and gas from master wallet
                    console.log(`transferring ${rentAndGas} SOL`);
                    const gasTransfer = await transferSOL(masterWalletPrivKey, wallet.publicKey, rentAndGas);
                    if (!gasTransfer) continue;

                    console.log(`transferring ${walletShareSOL} SOL`);
                    const transfer = await transferSOL(privateKey, wallet.publicKey, walletShareSOL);
                    if (!transfer) continue;
                } else {
                    walletShareNARA = Math.floor(distributeAmount * (distributionShares[i] / totalShare));
                    // Also need to transfer some SOL to new wallet for rent + gas
                    const rentAndGas = rentAmount + 5175000;
                    console.log(`transferring ${rentAndGas} SOL`);
                    const solTransfer = await transferSOL(masterWalletPrivKey, wallet.publicKey, rentAndGas);
                    if (!solTransfer) continue;

                    console.log(`transferring ${walletShareNARA} NARA`);
                    const naraTransfer = await transferNARA(
                        "2u9ZQVaSTVxCBVoyw75QioxivBnhLkCsJzvFTR8oGjAH", 
                        privateKey, 
                        wallet.publicKey, 
                        walletShareNARA
                    );
                    if (!naraTransfer) continue;
                }

                walletQueue.push({
                    privateKey: wallet.secretKey.base58,
                    isNaraToSol: !isNaraToSol,
                    amount: isNaraToSol ? walletShareSOL : walletShareNARA
                });
            }
        }
    } catch (error) {
        console.log(error);
        return;
    }
}
