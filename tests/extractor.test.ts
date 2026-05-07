import { describe, it, expect, vi } from 'vitest';
import { extractOgImage, extractArticleImages } from '../src/extractor';

describe('extractor', () => {
  describe('extractOgImage', () => {
    it('returns og:image content', async () => {
      const page = {
        $eval: vi.fn(() => Promise.resolve('https://scontent.cdninstagram.com/image.jpg')),
      };
      const result = await extractOgImage(page as never);
      expect(result).toBe('https://scontent.cdninstagram.com/image.jpg');
    });

    it('returns null when no og:image meta tag', async () => {
      const page = {
        $eval: vi.fn().mockRejectedValue(new Error('no such element')),
      };
      const result = await extractOgImage(page as never);
      expect(result).toBeNull();
    });
  });

  describe('extractArticleImages', () => {
    it('returns sorted images by width descending', async () => {
      const page = {
        $$eval: vi.fn((_selector, callback) => Promise.resolve(
          callback([
            { src: 'https://example.com/small.jpg', naturalWidth: 320, naturalHeight: 320 },
            { src: 'https://example.com/large.jpg', naturalWidth: 1080, naturalHeight: 1080 },
          ] as never),
        )),
      };
      const result = await extractArticleImages(page as never);
      expect(result).toHaveLength(2);
      expect(result[0].src).toBe('https://example.com/large.jpg');
      expect(result[1].src).toBe('https://example.com/small.jpg');
    });

    it('filters out images without valid width', async () => {
      const page = {
        $$eval: vi.fn((_selector, callback) => Promise.resolve(
          callback([
            { src: 'https://example.com/valid.jpg', naturalWidth: 1080, naturalHeight: 1080 },
            { src: 'https://example.com/invalid.jpg', naturalWidth: 0, naturalHeight: 0 },
          ] as never),
        )),
      };
      const result = await extractArticleImages(page as never);
      expect(result).toHaveLength(1);
    });
  });
});
