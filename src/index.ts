import { loadConfig } from './config';
import { BrowserManager } from './browser';
import { createApp } from './server';

const config = loadConfig();
const browser = BrowserManager.init(config);
const app = createApp(config, browser);

const server = app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});

const shutdown = async () => {
  console.log('Shutting down...');
  await browser.shutdown();
  server.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
