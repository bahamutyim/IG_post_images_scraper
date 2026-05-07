import { describe, it, expect } from 'vitest';
import { InstagramUrlSchema } from '../src/schema';

describe('InstagramUrlSchema', () => {
  it('accepts valid Instagram post URL', () => {
    const result = InstagramUrlSchema.safeParse({
      url: 'https://www.instagram.com/p/DM43Tt2xCTQ/',
    });
    expect(result.success).toBe(true);
  });

  it('accepts Instagram reel URL', () => {
    const result = InstagramUrlSchema.safeParse({
      url: 'https://instagram.com/reel/xyz789/',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-Instagram URL', () => {
    const result = InstagramUrlSchema.safeParse({
      url: 'https://example.com/page',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL format', () => {
    const result = InstagramUrlSchema.safeParse({
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects Instagram profile URL', () => {
    const result = InstagramUrlSchema.safeParse({
      url: 'https://instagram.com/someuser/',
    });
    expect(result.success).toBe(false);
  });
});
