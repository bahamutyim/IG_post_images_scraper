import { Page } from 'playwright';
import { ScraperResult, ImageResult } from './types';
import { BrowserManager } from './browser';
import { extractOgImage, extractArticleImages, resolveInstagramImageUrl } from './extractor';
import { RateLimitError, LoginWallError, PrivateAccountError, ScrapingError } from './errors';
import { AppConfig } from './config';

interface Candidate {
  width: number;
  height: number;
  url: string;
}

export class Scraper {
  constructor(private browser: BrowserManager, private config: AppConfig) {}

  async fetchImage(url: string): Promise<ScraperResult> {
    let { page, context } = await this.browser.createPage();
    try {
      console.log(`Navigating to ${url}`);
      const startTime = Date.now();
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.browser.navigationTimeout,
      }).catch((e) => {
        if (e.message.includes('Timeout')) {
          throw new ScrapingError('TIMEOUT', `Navigation timed out after ${this.config.browser.navigationTimeout}ms`);
        }
        throw e;
      });

      console.log(`Page loaded in ${Date.now() - startTime}ms`);

      // Check for rate limit
      if (response?.status() === 429) {
        throw new RateLimitError();
      }

      // Check for login wall
      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login/')) {
        throw new LoginWallError();
      }

      // Short wait for React rendering (Instagram is SPA)
      await page.waitForTimeout(800);

      // Collect ALL images by iterating through carousel slides
      const allImages: ImageResult[] = [];
      let hasNext = true;
      let slideCount = 0;
      const maxSlides = 20; // Most carousels have <10 slides

      while (hasNext && slideCount < maxSlides) {
        slideCount++;

        // Collect images from current slide (exclude page-level UI images)
        const slideImages = await extractCurrentSlideImages(page);
        allImages.push(
          ...slideImages.map((img): ImageResult => ({
            url: img.src,
            width: img.width || 0,
            height: img.height || 0,
            source: 'carousel-img',
          }))
        );

        // Check if Next button exists and click it
        hasNext = await page.evaluate(async () => {
          const nextBtn = Array.from(document.querySelectorAll('button')).find(
            (btn) => btn.getAttribute('aria-label') === 'Next'
          );
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });
      }

      console.log(`Collected ${allImages.length} images across ${slideCount} slides in ${Date.now() - startTime}ms`);

      // Extract og:image (always available)
      const ogImage = await extractOgImage(page);
      if (ogImage) {
        allImages.push({
          url: resolveInstagramImageUrl(ogImage),
          source: 'og:image',
        });
      }

      // Deduplicate by normalized URL, keep highest resolution
      const uniqueImages = deduplicateImages(allImages);

      return { images: uniqueImages };
    } catch (error) {
      if (error instanceof ScrapingError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Scraper error:', message);
      throw new ScrapingError('SCRAPER_ERROR', message);
    } finally {
      await this.browser.closePage(page, context);
    }
  }
}

function extractCurrentSlideImages(page: Page): Promise<{ src: string; width: number; height: number }[]> {
  return page.evaluate(() => {
    const images = document.querySelectorAll('img');
    return Array.from(images)
      .filter((img) => {
        const imgEl = img as HTMLImageElement;
        
        // Exclude images within "More posts from" section
        let el = img.parentElement;
        while (el && el !== document.body) {
          const text = el.textContent || '';
          if (text.includes('More posts from')) {
            return false;
          }
          el = el.parentElement;
        }
        
        // Filter: must be a reasonably sized image
        const w = imgEl.naturalWidth || imgEl.width || 0;
        const h = imgEl.naturalHeight || imgEl.height || 0;
        if (!imgEl.src || w < 150 || h < 150) return false;
        if (w === 150 && h === 150) return false;
        if (w < 640) return false;
        return true;
      })
      .map((img) => {
        const imgEl = img as HTMLImageElement;
        return { 
          src: imgEl.src, 
          width: imgEl.naturalWidth || imgEl.width || 0, 
          height: imgEl.naturalHeight || imgEl.height || 0 
        };
      });
  });
}

function deduplicateImages(images: ImageResult[]): ImageResult[] {
  const seen = new Map<string, ImageResult>();
  for (const img of images) {
    const normalized = img.url.split('?')[0];
    const existing = seen.get(normalized);
    if (!existing) {
      seen.set(normalized, img);
    } else if (
      (img.width || 0) > (existing.width || 0) ||
      (img.height || 0) > (existing.height || 0)
    ) {
      seen.set(normalized, img);
    }
  }
  return Array.from(seen.values());
}
