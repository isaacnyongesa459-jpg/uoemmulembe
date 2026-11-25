import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MIGRATION_DIRECTORY = fileURLToPath(new URL('../../migrations/', import.meta.url));
const MIGRATION_NAME = /^\d{3}_[a-z0-9_-]+\.sql$/u;
const MIGRATION_HISTORY_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(120) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

async function loadMigrations(directory) {
  const names = (await readdir(directory))
    .filter((name) => MIGRATION_NAME.test(name))
    .sort();
  const migrations = [];

  for (const name of names) {
    const sql = await readFile(path.join(directory, name), 'utf8');
    if (!isSafeAdditiveMigration(sql)) {
      throw new Error(`Migration ${name} is not an approved additive CREATE TABLE migration.`);
    }
    migrations.push({ name, sql });
  }

  return migrations;
}

export function isSafeAdditiveMigration(sql) {
  const startsWithCreateTable = /^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+[A-Za-z0-9_]+\s*\(/iu.test(sql);
  const oneCreateStatement = (sql.match(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/giu) ?? []).length === 1;
  const withoutReferentialActions = sql.replace(/\bON\s+(?:UPDATE|DELETE)\b/giu, 'ON ACTION');
  const containsMutation = /\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT|REPLACE|ALTER)\b/iu.test(withoutReferentialActions);
  return startsWithCreateTable && oneCreateStatement && !containsMutation;
}

async function migrationHistoryExists(connection) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS table_count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'`,
  );
  return Number(rows[0]?.table_count ?? 0) > 0;
}

export async function readMigrationStatus({ pool, directory = DEFAULT_MIGRATION_DIRECTORY }) {
  const migrations = await loadMigrations(directory);
  const connection = await pool.getConnection();
  try {
    const hasHistory = await migrationHistoryExists(connection);
    let recorded = [];
    if (hasHistory) {
      const [rows] = await connection.execute('SELECT migration_name FROM schema_migrations ORDER BY migration_name');
      recorded = rows.map((row) => row.migration_name);
    }
    const recordedSet = new Set(recorded);
    return {
      applied: migrations.filter((migration) => recordedSet.has(migration.name)).map((migration) => migration.name),
      pending: migrations.filter((migration) => !recordedSet.has(migration.name)).map((migration) => migration.name),
      unknownRecorded: recorded.filter((name) => !migrations.some((migration) => migration.name === name)),
    };
  } finally {
    connection.release();
  }
}

export async function applyMigrations({ pool, directory = DEFAULT_MIGRATION_DIRECTORY }) {
  const migrations = await loadMigrations(directory);
  const connection = await pool.getConnection();
  try {
    await connection.query(MIGRATION_HISTORY_DDL);
    const [rows] = await connection.execute('SELECT migration_name FROM schema_migrations');
    const appliedSet = new Set(rows.map((row) => row.migration_name));
    const applied = [];
    const skipped = [];

    for (const migration of migrations) {
      if (appliedSet.has(migration.name)) {
        skipped.push(migration.name);
        continue;
      }
      await connection.query(migration.sql);
      await connection.execute(
        'INSERT INTO schema_migrations (migration_name) VALUES (?)',
        [migration.name],
      );
      applied.push(migration.name);
      appliedSet.add(migration.name);
    }

    return { applied, skipped };
  } finally {
    connection.release();
  }
}
