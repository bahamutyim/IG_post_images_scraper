## Project Overview

Instagram post image scraper — a headless browser service that fetches **all images** from any public Instagram post. Uses standard Playwright (no stealth plugins). Supports authenticated sessions via cookies.

## Quick Start

```bash
npx playwright install chromium    # One-time browser install
npm run dev                       # Start dev server (port 3000)
npm run build                     # Compile to dist/
npm start                         # Run compiled server
npm test                          # Run tests (9 tests, mocked Playwright)
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
- **No stealth plugins** — uses standard Playwright.
- **Cookie-based auth** — session cookies loaded from JSON file on each request.
- **Carousel iteration** — clicks the "Next" button to traverse all carousel slides, collecting images per slide.
- **Deduplication** — normalizes URLs by stripping query params, keeps highest-resolution version.
- **Error middleware**: Maps domain errors to HTTP status codes.

### Key files

| File | Responsibility |
|---|---|
| `src/browser.ts` | Playwright launch, cookie import, per-request context factory, cleanup |
| `src/scraper.ts` | Orchestrate: navigate → iterate carousel → collect images → cleanup |
| `src/extractor.ts` | DOM extraction: `og:image` meta → size modifier stripping |
| `src/routes.ts` | Endpoint logic, proxy endpoint, error → HTTP mapping |
| `src/schema.ts` | Zod validation for Instagram URL format |
| `src/config.ts` | YAML loading + Zod schema validation |
| `src/errors.ts` | Custom error classes (`RateLimitError`, `LoginWallError`, etc.) |

### API

```
GET /api/instagram-image?url=<instagram-post-url>
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "images": [
      { "url": "...", "width": 1440, "height": 1920, "source": "carousel-img" },
      { "url": "...", "width": 1080, "height": 1080, "source": "carousel-img" },
      ...
    ]
  }
}
```

**Error codes → status:** `INVALID_URL` → 400, `LOGIN_WALL` → 403, `PRIVATE_ACCOUNT` → 403, `NOT_FOUND` → 404, `RATE_LIMITED` → 429, `TIMEOUT` → 504, `SCRAPER_ERROR` → 500.

## Image Sources

Images are collected from multiple sources in this priority:
1. **carousel-img** — main images from each carousel slide (via DOM extraction after "Next" button iteration)
2. **og:image** — the post's OpenGraph image tag (after size modifier stripping)

Size modifiers like `s640x640`, `dst-jpg_e35_s640x640_tt6`, and crop prefixes like `c288.0.864.864a_` are stripped from Instagram CDN URLs to maximize resolution.

## Authentication

Configure `config/config.yaml`:
```yaml
instagram:
  cookiesFile: "d:\\raymoond\\ig.json"
```

Cookies should be a JSON array of Playwright-compatible cookie objects (use `context.cookies()` from a logged-in session). Loaded automatically on each request. If cookies file is missing/empty, scraping continues unauthenticated (may hit private account errors).

## Configuration

Edit `config/config.yaml` to adjust:

- `server.port` — listening port
- `browser.userAgent` — impersonated browser UA (default: Chrome 122 on macOS)
- `browser.navigationTimeout` — page load timeout in ms
- `scraping.maxConcurrent` — simultaneous requests (1-20)
- `scraping.pageWaitMs` — extra wait after navigation for JS-rendered content
- `instagram.cookiesFile` — path to JSON file with Instagram session cookies

## Development Notes

- No stealth plugins — standard Playwright only.
- Browser is lazy: Chromium only launches on the first request.
- Every request creates and closes its own `BrowserContext` + `Page` for isolation.
- Carousel iteration stops at 50 slides or when no "Next" button remains.
- Tests use mocked Playwright Page objects (see `tests/extractor.test.ts`).
