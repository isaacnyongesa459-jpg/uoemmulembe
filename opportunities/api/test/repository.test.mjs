import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicWhere, createOpportunityRepository, escapeLikeTerm } from '../src/database/opportunities-repository.mjs';

const baseFilters = {
  q: '50%_!',
  category: 'jobs',
  country: 'Kenya_1',
  deadlineBefore: '2027-01-31',
  remote: true,
  page: 3,
  pageSize: 10,
};

test('search terms escape LIKE metacharacters using the explicit escape character', () => {
  assert.equal(escapeLikeTerm('50%_!'), '50!%!_!!');
});

test('every public SQL query requires active, verified, non-expired records', () => {
  const where = buildPublicWhere({});
  assert.match(where.sql, /status = 'active'/u);
  assert.match(where.sql, /verified_at IS NOT NULL/u);
  assert.match(where.sql, /deadline IS NULL OR deadline >= CURRENT_DATE/u);
  assert.deepEqual(where.values, []);
});

test('optional filters use parameter placeholders and never interpolate user values into SQL', () => {
  const where = buildPublicWhere(baseFilters);
  assert.match(where.sql, /title LIKE \? ESCAPE '!'/u);
  assert.match(where.sql, /category = \?/u);
  assert.match(where.sql, /deadline <= \?/u);
  assert.match(where.sql, /work_mode = 'remote'/u);
  assert.deepEqual(where.values, [
    '%50!%!_!!%',
    '%50!%!_!!%',
    '%50!%!_!!%',
    'jobs',
    '%Kenya!_1%',
    '2027-01-31',
  ]);
  assert.equal(where.sql.includes('Kenya'), false);
  assert.equal(where.sql.includes('50%'), false);
});

test('repository selects only public fields and uses bounded pagination literals', async () => {
  const calls = [];
  const publicRow = { id: 'c'.repeat(64), title: 'Reviewed opportunity' };
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.includes('COUNT(*)') ? [[{ total: '1' }], []] : [[publicRow], []];
    },
  };
  const repository = createOpportunityRepository(pool);
  const result = await repository.listPublic({ ...baseFilters, remote: false });

  assert.equal(result.total, 1);
  assert.deepEqual(result.data, [publicRow]);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /status = 'active'/u);
  assert.match(calls[0].sql, /verified_at IS NOT NULL/u);
  assert.match(calls[1].sql, /LIMIT 10 OFFSET 20/u);
  assert.match(calls[1].sql, /application_link AS applicationLink/u);
  assert.equal(calls[1].sql.includes('verification_flags'), false);
  assert.equal(calls[1].sql.includes('review_notes'), false);
  assert.equal(calls[1].sql.includes('is_suspicious'), false);
  assert.deepEqual(calls[1].values, calls[0].values);
});

test('direct callers cannot inject values or exceed bounded pagination limits', async () => {
  const calls = [];
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.includes('COUNT(*)') ? [[{ total: '0' }], []] : [[], []];
    },
  };
  const repository = createOpportunityRepository(pool);
  await repository.listPublic({
    q: 'jobs',
    page: 10_001,
    pageSize: '20 OFFSET 0; DROP TABLE opportunities',
  });

  assert.match(calls[1].sql, /LIMIT 20 OFFSET 0/u);
  assert.equal(calls[1].sql.includes('DROP TABLE'), false);
  assert.deepEqual(calls[1].values, ['%jobs%', '%jobs%', '%jobs%']);
});

test('detail lookup is constrained by the same public gate and a bound ID', async () => {
  let call;
  const pool = {
    async execute(sql, values) {
      call = { sql, values };
      return [[], []];
    },
  };
  const repository = createOpportunityRepository(pool);
  assert.equal(await repository.getPublicById('d'.repeat(64)), null);
  assert.match(call.sql, /id = \?/u);
  assert.match(call.sql, /status = 'active'/u);
  assert.match(call.sql, /verified_at IS NOT NULL/u);
  assert.equal(call.values[0], 'd'.repeat(64));
});
