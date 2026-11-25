import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isSafeAdditiveMigration } from '../src/database/migrate.mjs';

const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

test('all migrations are ordered, additive, single-table CREATE statements', async () => {
  const names = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual(names, [
    '001_create_opportunity_sources.sql',
    '002_create_opportunities.sql',
    '003_create_scrape_runs.sql',
    '004_create_opportunity_review_events.sql',
  ]);
  for (const name of names) {
    const sql = await readFile(new URL(name, `file://${migrationDirectory}/`), 'utf8');
    assert.equal(isSafeAdditiveMigration(sql), true, `${name} must be additive`);
    assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS/giu) ?? []).length, 1, `${name} must contain one DDL statement`);
  }
});

test('migration safety guard rejects destructive or data-writing SQL', () => {
  assert.equal(isSafeAdditiveMigration('CREATE TABLE IF NOT EXISTS safe_table (id INT);'), true);
  assert.equal(isSafeAdditiveMigration('CREATE TABLE IF NOT EXISTS safe_table (id INT); DROP TABLE safe_table;'), false);
  assert.equal(isSafeAdditiveMigration('CREATE TABLE IF NOT EXISTS safe_table (id INT); INSERT INTO safe_table VALUES (1);'), false);
});

test('opportunity schema supports verification, lifecycle, deduplication, and all Stage 1 fields', async () => {
  const sql = await readFile(new URL('002_create_opportunities.sql', `file://${migrationDirectory}/`), 'utf8');
  for (const field of [
    'title', 'organization', 'category', 'description', 'eligibility', 'location',
    'application_link', 'source_link', 'deadline', 'publication_date', 'discovered_at',
    'last_updated_at', 'status', 'work_mode', 'funding_details', 'verification_flags',
    'source_url_hash', 'is_suspicious', 'verified_at', 'review_notes',
  ]) {
    assert.match(sql, new RegExp(`\\b${field}\\b`, 'u'));
  }
  assert.match(sql, /pending_verification/u);
  assert.match(sql, /'active', 'expired', 'archived'/u);
});
