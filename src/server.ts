import { App } from './app';

const app = new App();
app.start().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});