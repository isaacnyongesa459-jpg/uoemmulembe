import { z } from 'zod';

export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'https://isaacnyongesa459-jpg.github.io',
]);

const positiveInteger = (minimum, maximum, fallback) => z.coerce
  .number()
  .int()
  .min(minimum)
  .max(maximum)
  .default(fallback);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveInteger(1024, 65535, 3000),
  DATABASE_URL: z.string().optional(),
  MYSQL_SSL: z.enum(['true', 'false']).default('true'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  API_RATE_LIMIT_WINDOW_MS: positiveInteger(1000, 3_600_000, 60_000),
  API_RATE_LIMIT_MAX: positiveInteger(1, 10_000, 120),
});

function parseAllowedOrigins(value) {
  const entries = value === undefined
    ? DEFAULT_ALLOWED_ORIGINS
    : value.split(',').map((item) => item.trim()).filter(Boolean);
  const origins = new Set();

  for (const entry of entries) {
    let url;
    try {
      url = new URL(entry);
    } catch {
      throw new Error('CORS_ALLOWED_ORIGINS must contain valid HTTP(S) origins.');
    }
    if (!['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash) {
      throw new Error('CORS_ALLOWED_ORIGINS must contain origins only, without paths or credentials.');
    }
    origins.add(url.origin);
  }

  return [...origins];
}

export function loadConfig(environment = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error('Invalid API environment configuration; check the documented variable names and ranges.');
  }

  const values = result.data;
  const mysqlSsl = values.MYSQL_SSL === 'true';
  if (values.NODE_ENV === 'production' && !mysqlSsl) {
    throw new Error('MYSQL_SSL must remain enabled in production.');
  }

  return Object.freeze({
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL?.trim() || undefined,
    mysqlSsl,
    allowedOrigins: Object.freeze(parseAllowedOrigins(values.CORS_ALLOWED_ORIGINS)),
    rateLimitWindowMs: values.API_RATE_LIMIT_WINDOW_MS,
    rateLimitMax: values.API_RATE_LIMIT_MAX,
  });
}
