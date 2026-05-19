import fs from 'fs';
import path from 'path';
import { chromium, DeviceDescriptor } from 'playwright';
import { Browser, BrowserContext, Cookie, Page } from 'playwright';
import { AppConfig } from './config';

const MOBILE_DEVICE: DeviceDescriptor = {
  name: 'iPhone 14',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaults: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  },
};

let browserInstance: Browser | null = null;

export class BrowserManager {
  private config: AppConfig;
  private constructor(config: AppConfig) {
    this.config = config;
  }

  static instance: BrowserManager | null = null;

  static init(config: AppConfig): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(config);
    }
    return BrowserManager.instance;
  }

  async getBrowser(): Promise<Browser> {
    if (browserInstance === null) {
      browserInstance = await chromium.launch({
        headless: true,
      });
    }
    return browserInstance;
  }

  async createPage(): Promise<{ page: Page; context: BrowserContext }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: MOBILE_DEVICE.userAgent,
      viewport: MOBILE_DEVICE.viewport,
      deviceScaleFactor: MOBILE_DEVICE.deviceScaleFactor,
      isMobile: MOBILE_DEVICE.isMobile,
      hasTouch: MOBILE_DEVICE.hasTouch,
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        Referer: 'https://www.instagram.com/',
      },
    });

    // Import cookies if configured
    const cookiesFile = this.config.instagram?.cookiesFile;
    console.log('Cookies file path:', cookiesFile);
    console.log('Cookies file exists:', cookiesFile ? fs.existsSync(cookiesFile) : 'No path provided');
    if (cookiesFile && fs.existsSync(cookiesFile)) {
      try {
        const raw = fs.readFileSync(cookiesFile, 'utf-8');
        const cookies: Cookie[] = JSON.parse(raw);
        await context.addCookies(cookies);
        console.log(`Loaded ${cookies.length} cookies from ${cookiesFile}`);
      } catch (e) {
        console.error('Failed to load cookies:', e instanceof Error ? e.message : e);
      }
    }

    const page = await context.newPage();
    page.setDefaultTimeout(this.config.browser.navigationTimeout);

    return { page, context };
  }

  async closePage(page: Page, context: BrowserContext): Promise<void> {
    try {
      await page.close();
    } catch {
      // Page may already be closed
    }
    try {
      await context.close();
    } catch {
      // Context may already be closed
    }
  }

  async shutdown(): Promise<void> {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  }
}
