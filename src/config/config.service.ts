import { Injectable } from '@nestjs/common';
import { AppConfig, defaultConfig, saveConfigToFile, loadConfigFromFile } from './app.config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { distributeTokens } from 'src/swap/swapLoop';
import { buyFunction } from 'src/swap/buyLoop';
import { sellFunction } from 'src/swap/sellLoop';
import Moralis from 'moralis';

const moralisKey = process.env.MORALIS_KEY as string;
const masterPrivateKey = process.env.PRIVATE_KEY as string;


@Injectable()
export class ConfigService {
  private currentConfig: AppConfig;
  private currentJob: Promise<void> | null = null;

  constructor() {
    this.currentConfig = loadConfigFromFile();
  }

  @Cron('*/10 * * * * *')
  async handleCron() {
    if (this.currentJob) {
      await this.currentJob;
      return;
    }

    this.currentJob = (async () => {
      try {
        const initialPrivateKey = masterPrivateKey;
        console.log(initialPrivateKey);

        console.log("Cron job running every second");
        const config = this.getConfig();
        const { trigger, diverse, sell, minWallets, maxWallets, untillMCap, minLot, maxLot, randomLot, minInterval, maxInterval, randomInterval } = config;


        if(trigger){
          const solPrice = await this.getSolanaPriceInUSDT();
          const lot = randomLot ? Math.floor(Math.random() * (maxLot - minLot) + minLot) : minLot;
          //@ts-ignore
          const lotInSol = lot / solPrice;
          console.log("Lot in SOL:", lotInSol);

          if(!diverse && sell){
            await sellFunction(initialPrivateKey, lotInSol);
          } else if(!diverse && !sell){
            await buyFunction(initialPrivateKey, lotInSol);
          } else if(diverse){
            // await distributeTokens(initialPrivateKey, true, untillMCap, minWallets, maxWallets, minLot, maxLot, minInterval, maxInterval, true);
          }
        } else {
          return;
        }

      } catch (error) {
        console.error("Error in cron job:", error);
      } finally {
        this.currentJob = null;
      }
    })();

    await this.currentJob;
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
}