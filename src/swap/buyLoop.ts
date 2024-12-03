import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, CpmmRpcData, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from './swapConfig'
import BN from 'bn.js'
import { isValidCpmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'


export const swapSOLtoNARA = async (input: string, privKey: string) => {
    try {
        const raydium = await initSdk(privKey)
        console.log("Swapping NARA to SOL", input);

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

        const returnData = {
            amount: swapResult.destinationAmountSwapped.toString(),
            volume: poolInfo.day,
        }

        return returnData

    } catch (error) {
        console.error(error)
    }
}

export const buyFunction = async (
    privateKey: string, 
    amountInSol: number,
): Promise<void> => {
    try {
    const amountInLamorts = amountInSol * 1000000000;
    await swapSOLtoNARA(amountInLamorts.toString(), privateKey);
    } catch (error) {
        console.error(`Distribution error:`, error);
    }
}