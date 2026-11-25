import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeRobotsPolicy } from '../src/crawl.mjs';
import { parseDetailPage, parseListingPage } from '../src/parse.mjs';
import { canonicalizeUrl, classifyCategory, stableId } from '../src/normalize.mjs';
import { mergePendingRecords } from '../src/store.mjs';
import { opportunitiesForYouth as source } from '../src/sources/opportunities-for-youth.mjs';

const listingFixture = await readFile(new URL('./fixtures/listing.html', import.meta.url), 'utf8');
const detailFixture = await readFile(new URL('./fixtures/detail.html', import.meta.url), 'utf8');

test('listing parser extracts titles, source links, region/category and publication dates', () => {
  const records = parseListingPage(listingFixture, {
    source,
    discoveredAt: '2026-11-25T00:00:00.000Z',
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].title, 'Global Fully Funded PhD Scholarship 2027');
  assert.equal(records[0].category, 'scholarships');
  assert.equal(records[0].location, 'Europe');
  assert.equal(records[0].publicationDate, '2026-11-20T09:00:00.000Z');
  assert.equal(records[0].status, 'pending_verification');
  assert.equal(records[1].category, 'technology');
  assert.equal(records[1].workMode, 'remote');
});

test('metadata-only listing cards do not become opportunity descriptions', () => {
  const html = '<article class="post hentry category-jobs"><h2><a href="https://opportunitiesforyouth.org/2026/11/23/graduate-program/">Graduate Job Program 2027</a></h2><p>Nov 23, 2026 | Jobs | Africa | 0</p></article>';
  const [record] = parseListingPage(html, { source });

  assert.equal(record.category, 'jobs');
  assert.equal(record.description, null);
  assert.ok(record.verificationFlags.includes('detail_page_not_checked'));
});

test('detail parser extracts candidate fields while keeping verification pending', () => {
  const [listing] = parseListingPage(listingFixture, {
    source,
    discoveredAt: '2026-11-25T00:00:00.000Z',
  });
  const detail = parseDetailPage(detailFixture, { ...listing, title: 'Global Fully Funded PhD Scholarship...' }, {
    source,
    updatedAt: '2026-11-25T01:00:00.000Z',
  });

  assert.equal(detail.title, 'Global Fully Funded PhD Scholarship 2027');
  assert.equal(detail.organization, 'Example University');
  assert.equal(detail.location, 'Sweden');
  assert.equal(detail.deadline, '2027-01-31T00:00:00.000Z');
  assert.match(detail.eligibility, /master's degree/u);
  assert.equal(detail.fundingDetails, 'Tuition and monthly stipend');
  assert.equal(detail.applicationLink, 'https://www.example.edu/admissions/apply');
  assert.equal(detail.applicationLinkCandidates.some((candidate) => candidate.url.includes('reddit.com')), false);
  assert.equal(detail.status, 'pending_verification');
  assert.ok(detail.verificationFlags.includes('official_application_link_not_verified'));

  const noDeadline = parseDetailPage(detailFixture.replace('January 31, 2027', 'Not stated in the source'), listing, { source });
  assert.equal(noDeadline.deadline, null);
  assert.ok(noDeadline.verificationFlags.includes('deadline_not_extracted'));
});

test('robots rules permit ordinary pages and reject disallowed search paths', () => {
  const text = [
    'User-agent: *',
    'Disallow: /wp-admin/',
    'Disallow: /search/',
    'Disallow: /?s=',
    '',
    'User-agent: GPTBot',
    'Disallow: /',
  ].join('\n');
  const policy = makeRobotsPolicy(source.robotsUrl, text, source.userAgent);

  assert.equal(policy.isAllowed(source.homepageUrl), true);
  assert.equal(policy.isAllowed('https://opportunitiesforyouth.org/2026/11/21/example/'), true);
  assert.equal(policy.isAllowed('https://opportunitiesforyouth.org/search/'), false);
});

test('canonical URLs remove fragments and common tracking parameters', () => {
  assert.equal(
    canonicalizeUrl('https://example.org/opportunity/?utm_source=feed&gclid=abc&id=8#apply', 'https://example.org'),
    'https://example.org/opportunity/?id=8',
  );
});

test('stable IDs deduplicate the same source record and updates retain discovery date', () => {
  const url = 'https://opportunitiesforyouth.org/2026/11/21/global-fully-funded-phd-scholarship/';
  const id = stableId(source.id, url);
  const first = {
    id,
    title: 'Opportunity',
    description: 'Old summary',
    discoveredAt: '2026-11-25T00:00:00.000Z',
    lastUpdatedAt: '2026-11-25T00:00:00.000Z',
    status: 'pending_verification',
  };
  const second = {
    ...first,
    description: 'Updated summary',
    discoveredAt: '2026-11-26T00:00:00.000Z',
    lastUpdatedAt: '2026-11-26T00:00:00.000Z',
    status: 'active',
  };
  const merged = mergePendingRecords([first], [second]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].discoveredAt, first.discoveredAt);
  assert.equal(merged[0].lastUpdatedAt, second.lastUpdatedAt);
  assert.equal(merged[0].status, 'pending_verification');
});

test('category classifier provides a stable fallback for unclassified listings', () => {
  assert.equal(classifyCategory('A new opportunity with no category cues'), 'other');
  assert.equal(classifyCategory('A conference with a scholarship component', ['europe', 'conferences']), 'conferences_programs');
  assert.equal(classifyCategory('ReEntry Program', ['fellowship', 'jobs']), 'jobs');
});
