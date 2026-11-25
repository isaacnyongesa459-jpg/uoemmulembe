import { loadConfig } from '../config.mjs';
import { applyMigrations, readMigrationStatus } from './migrate.mjs';
import { createDatabasePool } from './pool.mjs';

const config = loadConfig();
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required for migration operations.');
}

const pool = createDatabasePool(config.databaseUrl, { mysqlSsl: config.mysqlSsl });
try {
  const result = process.argv.includes('--status')
    ? await readMigrationStatus({ pool })
    : await applyMigrations({ pool });
  console.log(JSON.stringify({ event: 'migration_status', ...result }));
} catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/u.test(error.code)
    ? error.code
    : 'UNKNOWN_ERROR';
  console.error(JSON.stringify({ event: 'database_operation_failed', code }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
