import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  sell: boolean;
  trigger: boolean;
  diverse: boolean;
  minWallets: number;
  maxWallets: number;
  untillMCap: number;
  minLot: number;
  maxLot: number;
  randomLot: boolean;
  minInterval: number;
  maxInterval: number;
  randomInterval: boolean;
}

export const defaultConfig: AppConfig = {
    sell: false,
    trigger: false,
    diverse: false,
    minWallets: 1,
    maxWallets: 5,
    untillMCap: 100,
    minLot: 1,
    maxLot: 10,
    randomLot: false,
    minInterval: 5,
    maxInterval: 10,
    randomInterval: false
};

export const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

export function saveConfigToFile(config: AppConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config file:', error);
  }
}

export function loadConfigFromFile(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const rawConfig = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(rawConfig);
    }
    saveConfigToFile(defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('Error loading config file:', error);
    return defaultConfig;
  }
}