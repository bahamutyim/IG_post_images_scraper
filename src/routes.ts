import { Router, Request, Response, RequestHandler } from 'express';
import { Scraper } from './scraper';
import { AppConfig } from './config';
import { InstagramUrlSchema } from './schema';
import { ApiResponse, ScraperResult } from './types';
import { ScrapingError, RateLimitError } from './errors';

interface Dependencies {
  scraper: Scraper;
  config: AppConfig;
}

export function createRoute(deps: Dependencies): RequestHandler {
  const rateLimitTracker = new Map<string, number>();

  const isRateLimited = (ip: string): boolean => {
    const last = rateLimitTracker.get(ip);
    return last !== undefined && Date.now() - last < deps.config.scraping.rateLimitWindowMs;
  };

  const recordRateLimit = (ip: string): void => {
    rateLimitTracker.set(ip, Date.now());
  };

  const statusMap: Record<string, number> = {
    LOGIN_WALL: 403,
    PRIVATE_ACCOUNT: 403,
    NOT_FOUND: 404,
    TIMEOUT: 504,
    RATE_LIMITED: 429,
  };

  return async (req: Request, res: Response<ApiResponse<ScraperResult>>) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Per-IP rate limit check
    if (isRateLimited(ip)) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many failed requests from this IP' },
      });
    }

    // Validate query params
    const parsed = InstagramUrlSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: parsed.error.errors[0].message },
      });
    }

    try {
      const result = await deps.scraper.fetchImage(parsed.data.url);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof RateLimitError) {
        recordRateLimit(ip);
        return res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMITED', message: error.message },
        });
      }

      if (error instanceof ScrapingError) {
        const status = statusMap[error.code] ?? 500;
        return res.status(status).json({ success: false, error: { code: error.code, message: error.message } });
      }

      return res.status(500).json({
        success: false,
        error: { code: 'SCRAPER_ERROR', message: 'An unexpected error occurred' },
      });
    }
  };
}

export function createProxyRoute(): RequestHandler {
  return async (req: Request, res: Response) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_URL', message: 'Image URL required' } });
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: { code: 'IMAGE_FETCH_ERROR', message: `Failed to fetch image: ${response.status}` },
        });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const contentLength = response.headers.get('content-length');
      const buffer = Buffer.from(await response.arrayBuffer());

      res.set('Content-Type', contentType);
      if (contentLength) res.set('Content-Length', contentLength);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Proxy error:', message);
      return res.status(500).json({ success: false, error: { code: 'PROXY_ERROR', message } });
    }
  };
}

export function registerRoutes(router: Router, deps: Dependencies): void {
  router.get('/api/instagram-image', createRoute(deps));
  router.get('/api/proxy-image', createProxyRoute());
}
