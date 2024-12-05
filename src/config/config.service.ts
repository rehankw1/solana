import { Injectable } from '@nestjs/common';
import { AppConfig, defaultConfig, saveConfigToFile, loadConfigFromFile } from './app.config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { distributeTokensV3, getCurrentVolume } from 'src/swap/swapLoop';
import { buyFunction } from 'src/swap/buyLoop';
import { sellFunction } from 'src/swap/sellLoop';
import Moralis from 'moralis';
import { delay } from 'rxjs';
import 'dotenv/config'


const moralisKey = process.env.MORALIS_KEY as string;
const masterPrivateKey = process.env.PRIVATE_KEY as string;


@Injectable()
export class ConfigService {
  private currentConfig: AppConfig;
  private currentJob: Promise<void> | null = null;
  private lastExecutionTime: number | null = null;

  private isRunning = false;

  constructor() {
    this.currentConfig = loadConfigFromFile();
  }

  @Cron('*/10 * * * * *')
  async handleCron() {
    if (this.isRunning) {
      return;
    }
  
      try {
        this.isRunning = true;  
        const initialPrivateKey = masterPrivateKey;
        const config = this.getConfig();
        const { 
          trigger, 
          diverse, 
          sell, 
          minInterval, 
          maxInterval, 
          randomInterval,
          untillMCap,
          minWallets,
          maxWallets
        } = config;
  
        if (!trigger) return;
  
        if (diverse) {
          const solPrice = await this.getSolanaPriceInUSDT();
          const { minLot, maxLot, randomLot } = config;
          const lot = randomLot 
            ? Math.floor(Math.random() * (maxLot - minLot) + minLot) 
            : minLot;
          //@ts-ignore
          const lotInSol = lot / solPrice;
          const lotInLamports = lotInSol * 1000000000;
  
          await distributeTokensV3(
            initialPrivateKey, 
            false, 
            untillMCap, 
            lotInLamports, 
            minWallets, 
            maxWallets
          );
          return;
        }
  
        const currentTime = Date.now();
        const lastExecutionTime = this.lastExecutionTime || 0;
  
        const interval = randomInterval 
          ? Math.floor(Math.random() * (maxInterval - minInterval) + minInterval)
          : minInterval;

        const intervalInMilliseconds = interval * 1000;
        
        if (currentTime - lastExecutionTime < intervalInMilliseconds) return;
  
        const solPrice = await this.getSolanaPriceInUSDT();
        
        const { minLot, maxLot, randomLot } = config;
        const lot = randomLot 
          ? Math.floor(Math.random() * (maxLot - minLot) + minLot) 
          : minLot;
        
        //@ts-ignore
        const lotInSol = lot / solPrice;
  
        if (sell) {
          await sellFunction(initialPrivateKey, lotInSol);
        } else {
          await buyFunction(initialPrivateKey, lotInSol);
        }
  
        this.lastExecutionTime = currentTime;
  
      } catch (error) {
        console.error("Error in cron job:", error);
      } finally {
        this.isRunning = false;
      }  
  }

  getConfig(): AppConfig {
    return { ...this.currentConfig };
  }

  updateConfig(newConfig: Partial<AppConfig>): AppConfig {
    this.currentConfig = {
      ...this.currentConfig,
      ...newConfig
    };
    
    saveConfigToFile(this.currentConfig);
    
    return this.currentConfig;
  }

  getSolanaPriceInUSDT = async () => {
    try {
      await Moralis.start({
        apiKey: moralisKey
      });
    
      const response = await Moralis.SolApi.token.getTokenPrice({
        "network": "mainnet",
        "address": "So11111111111111111111111111111111111111112"
      });
    
      return response.raw.usdPrice;
    } catch (e) {
      console.error(e);
    }
  }

  // ----------------------------TESTING PURPOSE ONLY--------------------------------
    // @Cron('*/5 * * * * *')
// async handleCron() {
//   console.log(this.isRunning)
//   if (this.isRunning) {
//     console.log("waiting")
//     return;
//   }

//     try {
//       this.isRunning = true;
//       const config = this.getConfig();
//       const { 
//         trigger, 
//         diverse, 
//         sell, 
//         minInterval, 
//         maxInterval, 
//         randomInterval,
//         untillMCap,
//         minWallets,
//         maxWallets
//       } = config;

//       console.log('Cron job started', { trigger, diverse, sell });

//       if (!trigger) {
//         console.log('Trigger is false, skipping execution');
//         return;
//       }

//       const getSolanaPriceMock = () => Promise.resolve(1000);
//       const solPrice = await getSolanaPriceMock();

//       if (diverse) {
//         console.log('Diverse mode - Simulating token distribution');
//         await this.mockDistributeTokens(
//           untillMCap, 
//           minWallets, 
//           maxWallets
//         );
//         console.log("DONE")
//         return;
//       }

//       const currentTime = Date.now();
//       const lastExecutionTime = this.lastExecutionTime || 0;

//       const interval = randomInterval 
//         ? Math.floor(Math.random() * (maxInterval - minInterval) + minInterval)
//         : minInterval;

//       const intervalInMilliseconds = interval * 1000;
      
//       console.log('Interval check', { 
//         currentTime, 
//         lastExecutionTime, 
//         intervalInMilliseconds, 
//         timeDiff: currentTime - lastExecutionTime 
//       });


//       if (currentTime - lastExecutionTime < intervalInMilliseconds) {
//         console.log('Not enough time passed, skipping execution');
//         return;
//       }

//       const { minLot, maxLot, randomLot } = config;
//       const lot = randomLot 
//         ? Math.floor(Math.random() * (maxLot - minLot) + minLot) 
//         : minLot;
      
//       console.log('Lot calculation', { lot, randomLot });

//       if (sell) {
//         console.log('Simulating SELL operation', { lot });
//         await this.mockSellFunction(lot);
//         console.log("DONE")
//       } else {
//         console.log('Simulating BUY operation', { lot });
//         await this.mockBuyFunction(lot);
//         console.log("DONE")
//       }

//       this.lastExecutionTime = currentTime;
//       console.log("DONEEEEE")

//     } catch (error) {
//       console.error("Error in cron job:", error);
//     } finally {
//       console.log("in FINALLY")
//       this.isRunning = false;
//     }
//   ;

//   await this.currentJob;
// }

// private async mockSellFunction(lot: number): Promise<void> {
//   console.log(`Mock SELL: Selling ${lot} tokens`);
//   await new Promise(resolve => setTimeout(resolve, 10000));
// }

// private async mockBuyFunction(lot: number): Promise<void> {
//   console.log(`Mock BUY: Buying ${lot} tokens`);
//   await new Promise(resolve => setTimeout(resolve, 10000));
// }

// private async mockDistributeTokens(
//   untillMCap: number, 
//   minWallets: number, 
//   maxWallets: number
// ): Promise<void> {
//   console.log('Mock Distribute Tokens', { 
//     untillMCap, 
//     minWallets, 
//     maxWallets 
//   });
//   await new Promise(resolve => setTimeout(resolve, 20000));
// }
}