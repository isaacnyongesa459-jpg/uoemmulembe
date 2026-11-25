import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCrawler } from './crawl.mjs';
import { parseDetailPage, parseListingPage } from './parse.mjs';
import { opportunitiesForYouth as source } from './sources/opportunities-for-youth.mjs';
import { mergePendingRecords, readPendingRecords, writePendingRecords, writeRunLog } from './store.mjs';

const scraperDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.resolve(process.env.OPPORTUNITIES_OUTPUT ?? path.join(scraperDir, 'out', 'pending-opportunities.json'));
const runLogPath = path.join(scraperDir, 'out', 'last-run.json');
const maxListings = Math.max(1, Math.min(30, Number(process.env.OPPORTUNITIES_MAX_LISTINGS) || 12));
const configuredMaxDetails = process.env.OPPORTUNITIES_MAX_DETAILS === undefined ? 8 : Number(process.env.OPPORTUNITIES_MAX_DETAILS);
const maxDetails = Math.max(0, Math.min(maxListings, Number.isFinite(configuredMaxDetails) ? configuredMaxDetails : 8));
const delayMs = Math.max(1000, Math.min(10_000, Number(process.env.OPPORTUNITIES_REQUEST_DELAY_MS) || 1100));

async function main() {
  const startedAt = new Date().toISOString();
  const failures = [];
  let records = [];
  let cardsFound = 0;
  let requestCount = 0;

  const crawler = await createCrawler({
    robotsUrl: source.robotsUrl,
    userAgent: source.userAgent,
    minDelayMs: delayMs,
  });

  try {
    const homepage = await crawler.fetchHtml(source.homepageUrl);
    const cards = parseListingPage(homepage, { source, maxCards: maxListings });
    cardsFound = cards.length;

    for (const [index, listing] of cards.entries()) {
      if (index >= maxDetails) {
        records.push({
          ...listing,
          verificationFlags: [...new Set([...listing.verificationFlags, 'detail_not_fetched_by_run_limit'])],
        });
        continue;
      }
      try {
        const html = await crawler.fetchHtml(listing.sourceLink);
        records.push(parseDetailPage(html, listing, { source }));
      } catch (error) {
        failures.push({ url: listing.sourceLink, message: error.message });
        records.push({
          ...listing,
          verificationFlags: [...new Set([...listing.verificationFlags, 'detail_fetch_failed', 'pending_provider_verification'])],
        });
      }
    }
  } catch (error) {
    failures.push({ url: source.homepageUrl, message: error.message });
  }

  requestCount = crawler.requestCount;
  const previous = await readPendingRecords(outputPath);
  const merged = mergePendingRecords(previous, records);
  const finishedAt = new Date().toISOString();
  const summary = {
    source: source.name,
    startedAt,
    finishedAt,
    requests: requestCount,
    listingCardsFound: cardsFound,
    candidatesThisRun: records.length,
    pendingRecordsAfterMerge: merged.length,
    failures,
    publication: 'disabled — all records remain pending_verification',
  };

  await writePendingRecords(outputPath, merged);
  await writeRunLog(runLogPath, summary);
  console.log(JSON.stringify({ ...summary, outputPath }, null, 2));

  if (failures.length > 0 && records.length === 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Scraper stopped safely: ${error.message}`);
  process.exitCode = 1;
});
