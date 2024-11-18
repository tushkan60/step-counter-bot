import express from 'express';
import { DatabaseService } from './services/database';
import { TelegramService } from './services/telegram';
import config from './config/config';

export class App {
  public app: express.Application;
  private readonly dbService: DatabaseService;
  private telegramService: TelegramService;
  private server: any;

  constructor() {
    this.app = express();
    this.dbService = new DatabaseService();
    this.telegramService = new TelegramService(this.dbService);
    this.initializeMiddlewares();
    this.setupGracefulShutdown();
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupGracefulShutdown() {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private async shutdown() {
    console.log('Shutting down application...');

    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    await this.dbService.close();
    process.exit(0);
  }

  public async start() {
    try {
      // Initialize database first
      await this.dbService.init();
      console.log('Database initialized successfully');

      // Verify database connection
      const isConnected = await this.dbService.checkConnection();
      if (!isConnected) {
        throw new Error('Database connection check failed');
      }

      // Start express server
      this.server = this.app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
      });
    } catch (error) {
      console.error('Error starting the application:', error);
      process.exit(1);
    }
  }
}
