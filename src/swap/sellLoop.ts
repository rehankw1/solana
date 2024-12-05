import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, CpmmRpcData, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from './swapConfig'
import BN from 'bn.js'
import { isValidCpmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'


export const swapNARAtoSOL = async (input: string, privKey: string) => {
    try {
        const raydium = await initSdk(privKey)
        console.log("Swapping NARA to SOL", input);

        // SOL - NARA pool
        const poolId = 'BkTTZ5K2QJUtDyRhFfbTHMQ5B9XK5tm4dvEcJf9HZAK4'
        const outputAmount = new BN(input)
        
        const outputMint = NATIVE_MINT.toBase58()
      
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
      
        // printSimulateInfo()
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

export const sellFunction = async (
    privateKey: string, 
    amountInSol: number,
): Promise<void> => {
    try {
    const amountInLamorts = amountInSol * 1000000000;
    await swapNARAtoSOL(amountInLamorts.toString(), privateKey);
    return;

    } catch (error) {
        console.error(`Distribution error:`, error);
        return
    }
}