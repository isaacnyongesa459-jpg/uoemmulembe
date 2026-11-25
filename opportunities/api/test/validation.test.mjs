import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { parseMysqlUrl } from '../src/database/pool.mjs';
import { parseOpportunityQuery } from '../src/validation/opportunity-query.mjs';

test('query validation supplies bounded defaults and converts typed filters', () => {
  const defaults = parseOpportunityQuery({});
  assert.equal(defaults.success, true);
  assert.equal(defaults.data.page, 1);
  assert.equal(defaults.data.pageSize, 20);

  const parsed = parseOpportunityQuery({
    q: '  fellowship  ',
    category: 'fellowships',
    country: 'Kenya',
    deadlineBefore: '2027-06-30',
    remote: 'true',
    page: '2',
    pageSize: '15',
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.q, 'fellowship');
  assert.equal(parsed.data.remote, true);
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.pageSize, 15);
});

test('query validation rejects unknown fields, invalid dates, and excessive page sizes', () => {
  assert.equal(parseOpportunityQuery({ unexpected: 'value' }).success, false);
  assert.equal(parseOpportunityQuery({ deadlineBefore: '2027-02-30' }).success, false);
  assert.equal(parseOpportunityQuery({ pageSize: '51' }).success, false);
  assert.equal(parseOpportunityQuery({ category: 'unlisted-category' }).success, false);
});

test('environment defaults constrain CORS to the existing GitHub Pages origin and keep TLS enabled', () => {
  const config = loadConfig({ NODE_ENV: 'test', PORT: '3000' });
  assert.equal(config.port, 3000);
  assert.equal(config.mysqlSsl, true);
  assert.deepEqual(config.allowedOrigins, ['https://isaacnyongesa459-jpg.github.io']);
  assert.equal(config.rateLimitMax, 120);
});

test('production rejects disabled MySQL TLS and CORS rejects paths or credentials', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', MYSQL_SSL: 'false' }), /MYSQL_SSL/u);
  assert.throws(() => loadConfig({ NODE_ENV: 'test', CORS_ALLOWED_ORIGINS: 'https://example.org/path' }), /origins only/u);
  assert.throws(() => loadConfig({ NODE_ENV: 'test', CORS_ALLOWED_ORIGINS: 'https://user@example.org' }), /origins only/u);
});

test('MySQL connection URL decoding preserves credentials, TLS verification, and safe pool settings', () => {
  const options = parseMysqlUrl('mysql://api-user:p%40ss%3Aword@db.example:3307/opportunities', { mysqlSsl: true });
  assert.equal(options.host, 'db.example');
  assert.equal(options.port, 3307);
  assert.equal(options.user, 'api-user');
  assert.equal(options.password, 'p@ss:word');
  assert.equal(options.database, 'opportunities');
  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
  assert.equal(options.multipleStatements, false);
  assert.equal(options.connectionLimit, 5);
});
