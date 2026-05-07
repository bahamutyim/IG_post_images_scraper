# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Instagram post image URL scraper — a headless browser service that fetches the image URL from any public Instagram post. Uses Playwright with stealth mode to bypass bot detection.

## Quick Start

```bash
npx playwright install chromium    # One-time browser install
npm run dev                       # Start dev server (port 3000)
npm run build                     # Compile to dist/
npm start                         # Run compiled server
npm test                          # Run tests
```

## Architecture

```
index.ts → config.ts → server.ts → routes.ts → scraper.ts → browser.ts → extractor.ts
                               ↓
                          schema.ts (Zod validation)
                               ↓
                          errors.ts (custom error classes)
```

- **Single Chromium instance** (lazy-launched on first request) with **fresh BrowserContext per request**.
- **Stealth mode**: `playwright-extra` + `puppeteer-extra-plugin-stealth` patches navigator.webdriver, WebGL, and other fingerprinting signatures.
- **Concurrency limiter**: Semaphore in `routes.ts` (max 3 concurrent scrapers).
- **Error middleware**: Maps domain errors to HTTP status codes.

### Key files

| File | Responsibility |
|---|---|
| `src/browser.ts` | Playwright launch, stealth setup, per-request context factory, cleanup |
| `src/scraper.ts` | Orchestrate: navigate → detect login wall/429 → extract → cleanup |
| `src/extractor.ts` | DOM extraction: `og:image` meta → `article img` fallback |
| `src/routes.ts` | Endpoint logic, per-IP rate limit tracking, error → HTTP mapping |
| `src/schema.ts` | Zod validation for Instagram URL format |
| `src/config.ts` | YAML loading + Zod schema validation |
| `src/errors.ts` | Custom error classes (`RateLimitError`, `LoginWallError`, etc.) |

### API

```
GET /api/instagram-image?url=<instagram-post-url>
```

**Success (200):**
```json
{ "success": true, "data": { "imageUrl": "...", "source": "og:image", "width": 1080, "height": 1080 } }
```

**Error codes → status:** `INVALID_URL` → 400, `LOGIN_WALL` → 403, `PRIVATE_ACCOUNT` → 403, `NOT_FOUND` → 404, `RATE_LIMITED` → 429, `TIMEOUT` → 504, `SCRAPER_ERROR` → 500.

## Modifying the scraper

Instagram changes their DOM frequently. The extraction logic is isolated in `src/extractor.ts`:

1. **Primary selector**: `meta[property="og:image"]` — Instagram always sets this for public posts.
2. **Fallback selector**: `article img[decoding="async"]` — pick the highest-resolution image.

To update selectors, edit only `extractor.ts`. The scraper (`scraper.ts`) calls these functions and handles error propagation.

## Configuration

Edit `config/config.yaml` to adjust:

- `server.port` — listening port
- `browser.userAgent` — impersonated browser UA (default: Chrome 122 on macOS)
- `browser.navigationTimeout` — page load timeout in ms
- `scraping.maxConcurrent` — simultaneous requests (1-20)
- `scraping.pageWaitMs` — extra wait after navigation for JS-rendered content

## Development Notes

- No circular imports — modules depend only on files listed below them in the dependency graph.
- Browser is lazy: Chromium only launches on the first request.
- Every request creates and closes its own `BrowserContext` + `Page` for isolation.
- Tests use mocked Playwright Page objects (see `tests/extractor.test.ts`).
