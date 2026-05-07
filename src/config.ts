import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { z } from 'zod';

const ConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
  }),
  browser: z.object({
    launchTimeout: z.number(),
    navigationTimeout: z.number(),
    userAgent: z.string(),
    viewportWidth: z.number(),
    viewportHeight: z.number(),
  }),
  scraping: z.object({
    maxConcurrent: z.number().int().min(1).max(20),
    rateLimitWindowMs: z.number(),
    maxRetries: z.number().int().min(0).max(5),
    retryDelayMs: z.number(),
    pageWaitMs: z.number(),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  const yamlPath = path.join(process.cwd(), 'config', 'config.yaml');
  const raw = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.parse(raw);
  return ConfigSchema.parse(parsed);
}
