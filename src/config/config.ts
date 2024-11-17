import dotenv from 'dotenv';
import { Config } from '@/types/types';

dotenv.config();

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  dbPath: process.env.DB_PATH || 'steps.db',
};

export default config;
