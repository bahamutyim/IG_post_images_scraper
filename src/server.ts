import express, { RequestHandler } from 'express';
import { BrowserManager } from './browser';
import { Scraper } from './scraper';
import { registerRoutes } from './routes';
import { AppConfig } from './config';

export function createServer(config: AppConfig, browser: BrowserManager) {
  const app = express();
  app.use(express.json());

  const scraper = new Scraper(browser, config);
  registerRoutes(app, { scraper, config });

  return { app, scraper };
}

export function createApp(config: AppConfig, browser: BrowserManager) {
  const { app } = createServer(config, browser);
  return app;
}
