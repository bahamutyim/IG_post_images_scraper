import { Page } from 'playwright';

export async function extractOgImage(page: Page): Promise<string | null> {
  const content = await page.$eval('meta[property="og:image"]', (el) => {
    return (el as HTMLMetaElement).content ?? null;
  }).catch(() => null);

  if (!content) return null;
  return resolveUrl(content);
}

interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

export async function extractArticleImages(page: Page): Promise<ImageInfo[]> {
  const images = await page.$$eval('article img[decoding="async"]', (imgs) =>
    imgs
      .map((img) => {
        const imgEl = img as HTMLImageElement;
        return {
          src: imgEl.src,
          width: imgEl.naturalWidth,
          height: imgEl.naturalHeight,
        };
      })
      .filter((img) => img.src && img.width > 0),
  );

  return images.sort((a, b) => b.width - a.width);
}

function resolveUrl(url: string): string {
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

export function resolveInstagramImageUrl(url: string): string {
  // Instagram og:image URLs contain size/crop modifiers in CDN query params:
  // c288.0.864.864a_dst-jpg_e35_s640x640_tt6  ->  dst-jpg_e35_tt6
  // /s150x150/                                 ->  /
  // Must NOT strip _nc_ss, _nc_sst, _nc_ht, etc.
  return url
    
}
