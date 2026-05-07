import { z } from 'zod';

export const InstagramUrlSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .refine((val) => {
      try {
        const parsed = new URL(val);
        return parsed.hostname.endsWith('instagram.com') &&
          (parsed.pathname.startsWith('/p/') || parsed.pathname.startsWith('/reel/'));
      } catch {
        return false;
      }
    }, { message: 'URL must be an Instagram post (instagram.com/p/ or instagram.com/reel/)' }),
});

export type InstagramUrlInput = z.infer<typeof InstagramUrlSchema>;
