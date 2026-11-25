# Stage 1 scraper

This package is a manual, single-source prototype for the MULEMBE Union Global Opportunities Aggregator. It uses Node.js 22, native `fetch`, Cheerio and `robots-parser`. It has no search API, Express server, database, daily schedule, admin UI or automatic publication.

Run `npm ci` once, then `npm test` for the offline fixture tests. A controlled manual run is `npm run scrape`. It fetches the source's robots file first, checks each same-origin page against the active rules, spaces requests by at least one second, retries only transient failures, and stops on redirects or recognizable access challenges. It never visits application-provider domains; it only records qualifying external application-link candidates for human review.

The CLI examines the public homepage and a bounded number of same-site opportunity detail pages. Configuration is through `OPPORTUNITIES_MAX_LISTINGS` (1–30), `OPPORTUNITIES_MAX_DETAILS` (0–list limit), `OPPORTUNITIES_REQUEST_DELAY_MS` (minimum 1,000ms, maximum 10,000ms) and `OPPORTUNITIES_OUTPUT` (optional output-file path). The default output is `out/pending-opportunities.json`; a compact run record is written to `out/last-run.json`. The entire `out/` directory is ignored by Git.

Each result carries a stable ID, title, organization, category, short description, eligibility, location, application link and unverified candidates, source link/name, deadline, publication/discovery/update dates, status, work mode, funding details and verification flags. Missing or uncertain values stay `null` or are flagged rather than invented. Every result is written as `pending_verification`; the CLI has no publish path.

Current scope is intentionally one source and local output. A persistent daily schedule, cross-machine database, multi-source management, authenticated review and public feed require the later backend/runtime decision recorded in [`docs/opportunities-architecture.md`](../../docs/opportunities-architecture.md).
