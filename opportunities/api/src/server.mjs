import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createDatabasePool } from './database/pool.mjs';
import { createOpportunityRepository } from './database/opportunities-repository.mjs';
import { consoleLogger } from './http/request-logger.mjs';

const config = loadConfig();
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required before starting the API server.');
}

const pool = createDatabasePool(config.databaseUrl, { mysqlSsl: config.mysqlSsl });
const repository = createOpportunityRepository(pool);
const app = createApp({
  repository,
  checkDatabase: async () => {
    await pool.query('SELECT 1');
  },
  allowedOrigins: config.allowedOrigins,
  rateLimitWindowMs: config.rateLimitWindowMs,
  rateLimitMax: config.rateLimitMax,
  logger: consoleLogger,
});

const server = app.listen(config.port, '0.0.0.0', () => {
  consoleLogger.info({
    event: 'server_started',
    service: 'mulembe-union-opportunities-api',
    host: '0.0.0.0',
    port: config.port,
    nodeEnv: config.nodeEnv,
  });
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  consoleLogger.info({ event: 'server_shutdown_started', signal });
  const forceExit = setTimeout(() => {
    consoleLogger.error({ event: 'server_shutdown_timeout' });
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (error) => {
    try {
      await pool.end();
      clearTimeout(forceExit);
      if (error) {
        consoleLogger.error({ event: 'server_shutdown_error', errorType: error.name ?? 'Error' });
        process.exitCode = 1;
      } else {
        consoleLogger.info({ event: 'server_shutdown_complete' });
      }
    } catch {
      clearTimeout(forceExit);
      consoleLogger.error({ event: 'database_pool_shutdown_error' });
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
