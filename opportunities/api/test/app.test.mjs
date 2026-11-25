import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.mjs';

const quietLogger = { info() {}, error() {} };
const sampleId = 'a'.repeat(64);
const sampleOpportunity = Object.freeze({
  id: sampleId,
  title: 'Graduate Data Fellowship',
  organization: 'Example Institute',
  category: 'fellowships',
  description: 'A sample response held in test memory only.',
  eligibility: 'Recent graduates',
  location: 'Kenya',
  applicationLink: 'https://provider.example/apply',
  sourceName: 'Example source',
  sourceLink: 'https://source.example/listing',
  deadline: '2027-06-30',
  publicationDate: null,
  discoveredAt: '2026-11-25T12:00:00.000Z',
  lastUpdatedAt: '2026-11-25T12:00:00.000Z',
  workMode: 'remote',
  fundingDetails: null,
});

async function withServer(options, run) {
  const app = createApp({
    repository: {
      async listPublic() {
        return { data: [sampleOpportunity], total: 1 };
      },
      async getPublicById(id) {
        return id === sampleId ? sampleOpportunity : null;
      },
    },
    checkDatabase: async () => {},
    allowedOrigins: ['https://isaacnyongesa459-jpg.github.io'],
    logger: quietLogger,
    ...options,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('health is an unauthenticated liveness check and does not query the database', async () => {
  let databaseChecks = 0;
  await withServer({ checkDatabase: async () => { databaseChecks += 1; } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'mulembe-union-opportunities-api');
    assert.equal(databaseChecks, 0);
    assert.ok(response.headers.get('x-request-id'));
  });
});

test('readiness reports database connectivity without leaking failure details', async () => {
  await withServer({ checkDatabase: async () => { throw new Error('private connection detail'); } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: 'not_ready',
      checks: { database: 'unavailable' },
    });
  });
});

test('public list validates filters and returns pagination with a correlated request ID', async () => {
  let receivedFilters;
  await withServer({
    repository: {
      async listPublic(filters) {
        receivedFilters = filters;
        return { data: [sampleOpportunity], total: 23 };
      },
      async getPublicById() { return null; },
    },
  }, async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/opportunities?q=fellowship&category=fellowships&country=Kenya&deadlineBefore=2027-06-30&remote=true&page=2&pageSize=10`,
      { headers: { 'X-Request-Id': 'test-request_123' } },
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'test-request_123');
    assert.deepEqual(receivedFilters, {
      q: 'fellowship',
      category: 'fellowships',
      country: 'Kenya',
      deadlineBefore: '2027-06-30',
      remote: true,
      page: 2,
      pageSize: 10,
    });
    assert.equal(body.data[0].id, sampleId);
    assert.deepEqual(body.pagination, {
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});

test('invalid query parameters receive a safe 400 and do not reach the repository', async () => {
  let called = false;
  await withServer({
    repository: {
      async listPublic() { called = true; return { data: [], total: 0 }; },
      async getPublicById() { return null; },
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/opportunities?page=0&deadlineBefore=2027-02-30`);
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'invalid_query');
    assert.equal(called, false);
  });
});

test('detail only returns repository-approved records and validates stable IDs', async () => {
  await withServer({}, async (baseUrl) => {
    const found = await fetch(`${baseUrl}/api/v1/opportunities/${sampleId}`);
    assert.equal(found.status, 200);
    assert.equal((await found.json()).data.id, sampleId);

    const invalid = await fetch(`${baseUrl}/api/v1/opportunities/not-an-id`);
    assert.equal(invalid.status, 400);

    const absent = await fetch(`${baseUrl}/api/v1/opportunities/${'b'.repeat(64)}`);
    assert.equal(absent.status, 404);
  });
});

test('only the configured browser origin is allowed', async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/opportunities`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'origin_not_allowed');
  });
});

test('API write routes do not exist and the backend-only route manifest is served as JSON', async () => {
  await withServer({}, async (baseUrl) => {
    const writeResponse = await fetch(`${baseUrl}/api/v1/opportunities`, { method: 'POST' });
    assert.equal(writeResponse.status, 404);

    const manifestResponse = await fetch(`${baseUrl}/manus-routes.json`);
    assert.equal(manifestResponse.status, 200);
    assert.deepEqual(await manifestResponse.json(), { routes: [] });
  });
});

test('API rate limit is enforced while health checks remain reachable', async () => {
  await withServer({ rateLimitMax: 1 }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/opportunities`)).status, 200);
    const limited = await fetch(`${baseUrl}/api/v1/opportunities`);
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error.code, 'rate_limited');
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  });
});
