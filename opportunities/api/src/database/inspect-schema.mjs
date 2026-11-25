import { loadConfig } from '../config.mjs';
import { createDatabasePool } from './pool.mjs';

const APPLICATION_TABLES = [
  'schema_migrations',
  'opportunity_sources',
  'opportunities',
  'scrape_runs',
  'opportunity_review_events',
];

const config = loadConfig();
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required for schema inspection.');
}

const pool = createDatabasePool(config.databaseUrl, { mysqlSsl: config.mysqlSsl });
try {
  const placeholders = APPLICATION_TABLES.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME AS tableName,
            COLUMN_NAME AS columnName,
            DATA_TYPE AS dataType,
            IS_NULLABLE AS isNullable,
            ORDINAL_POSITION AS ordinalPosition
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    APPLICATION_TABLES,
  );
  console.log(JSON.stringify({ event: 'schema_inspection', tables: rows }));
} catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,64}$/u.test(error.code)
    ? error.code
    : 'UNKNOWN_ERROR';
  console.error(JSON.stringify({ event: 'schema_inspection_failed', code }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
