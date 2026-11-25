# Global Opportunities Aggregator: architecture, Stage 1 and Stage 2 API foundation

## Existing deployment boundary

The current MULEMBE Union site is generated as static HTML and served from the repository root on GitHub Pages. Pages remains the public interface and its publishing settings and routes are unchanged. It cannot run the requested Express server, durable database, authenticated moderation tools or a reliable application-owned daily worker. Stage 1 added an isolated Node.js command-line scraper; Stage 2 now adds a separate read-only API and managed data schema without changing the live pages.

## Approved architecture and hosting direction

The intended full architecture is a static Opportunities page on the existing site that reads approved listings from a separate REST API. A Node.js/Express backend owns the database, validation and later review workflow. A daily job will run in the selected backend/worker environment. An authenticated admin interface will review pending records and manage sources and categories. The public page receives only approved listings. Phase 1 discovery remains web scraping only; no search API, Google API or other external search API is included.

On 2026-11-25, the user selected and approved a separate hosted Express/database backend while retaining GitHub Pages for the public site. The backend is a separate Manus WebDev project with the Server and managed MySQL capabilities enabled. It uses WebDev Autoscale/on-demand hosting; idle deployments can sleep and the first later request can experience a cold start. The backend source of truth is `opportunities/api/` in this repository. The separate WebDev deployment workspace is synchronized explicitly; the deployment copy is not the GitHub Pages site and its changes do not automatically sync back to GitHub. Higher-volume WebDev usage may incur usage-based charges.

The managed database is shared between development Preview and the published API. Database changes must therefore be additive and deliberate. Tests use synthetic in-memory repositories and never insert sample listings. The first schema migration is run only after a read-only inspection of existing table metadata and migration history.

## Project structure

```text
opportunities/
  scraper/
    package.json                     # manual, robots-aware Node CLI
    src/
      cli.mjs                         # manual entry point and run summary
      crawl.mjs                       # robots checks, rate limits, retries, HTML fetch
      parse.mjs                       # card/detail extraction and category mapping
      normalize.mjs                   # stable IDs, canonical links, deduplication
      store.mjs                       # local pending-output merge; no publication
      sources/
        opportunities-for-youth.mjs  # first source and allowed listing URLs
    test/fixtures/                    # synthetic fixtures
    test/scraper.test.mjs             # parser, URL and dedupe tests
    out/                              # generated pending output; ignored by Git
  api/
    Dockerfile                       # pinned Node runtime and production entrypoint
    package.json / package-lock.json # Express, MySQL, validation and safety deps
    src/
      app.mjs                         # read-only HTTP routes, CORS, limits, errors
      server.mjs                      # 0.0.0.0 listener and graceful shutdown
      database/                       # MySQL pool, public repository, inspection/migrations
      http/                           # request IDs and structured request logs
      validation/                     # bounded public query parsing
    migrations/                       # additive source, opportunity, run and review tables
    public/manus-routes.json          # empty UI route list for this backend-only project
    test/                             # database-free HTTP, repository and schema tests

src/pages/                            # existing static site; future public UI integration
```

## Stage 1: compliant discovery scraper

Stage 1 uses Node's built-in `fetch`, `node:test` and `node:assert`; Cheerio parses HTML and `robots-parser` evaluates robots rules. Requests are sequential, use a transparent project User-Agent, have bounded retries and timeouts, and stop rather than bypass authentication, CAPTCHAs, paywalls or anti-bot interstitials. The CLI writes short summaries and source links to Git-ignored local JSON. Duplicate listing URLs receive stable IDs; every record remains `pending_verification` and is never automatically published.

## Stage 2: read-only API and data foundation

`opportunities/api/` implements `GET /api/health`, database-backed `GET /api/ready`, paginated `GET /api/v1/opportunities`, and `GET /api/v1/opportunities/:id`. Query validation bounds page size and supports keyword, normalized category, location/country text, deadline-before date and remote filters. All user-supplied filter values use prepared SQL parameters. The managed MySQL-compatible TiDB rejects prepared placeholders in `LIMIT`, so the repository independently rechecks `page` and `pageSize` as bounded integers before interpolating those two numeric pagination literals; tests cover the limits and injection boundary. The repository only selects public fields from records that are `active`, have `verified_at`, and have no elapsed date deadline. Internal verification flags, review notes, application-link candidates and suspicious-listing markers are never returned publicly. Missing or unverified records are not made visible by discovery.

The additive MySQL schema stores the requested listing fields and supporting source, scrape-run, deduplication, verification and review-history metadata. Read-only inspection found no pre-existing application tables; all four additive migrations and their history were applied and then verified read-only. `npm run db:inspect` and `npm run db:status` are read-only. `npm run db:migrate` is a separate finite operation; the HTTP server never migrates on startup. No sample/source/listing records were seeded. Preview verified the liveness and database-readiness endpoints, unfiltered and fully filtered empty-list queries, safe detail-not-found and invalid-query responses, and the backend-only route manifest. The separate WebDev checkpoint and first container publish succeeded. The project landing page remains owner-only, while published unauthenticated API health, readiness and listing GET routes were verified directly; the broader project visibility was not changed. No ingestion, admin mutation/authentication, scheduled run, or sample data is included in this foundation.

## Source selection

The first adapter is [Opportunities for Youth](https://opportunitiesforyouth.org/). Its current `robots.txt` has a catch-all rule that disallows administrative/search paths but does not disallow the ordinary public listing/article URLs used by this prototype. It also names specific AI crawlers as disallowed; this scraper is a deterministic, clearly identified collector and will not impersonate those crawlers. The rules are fetched and checked again at runtime, and a disallowed or unavailable robots file stops the run. The source homepage exposes opportunities across regions and several relevant categories. A sample listing presents host/location, funding, deadline and eligibility information and links onward to provider pages. Those details are leads, not verified claims; the scraper retains a concise excerpt and source URL, and leaves application-link candidates for human review. [1] [2] [3]

[Youth Opportunities](https://www.youthop.com/) is a possible next source because its public categories span scholarships, fellowships, jobs, volunteering, conferences, training and other programs, and its robots file does not block ordinary pages. Its terms/reuse policy still needs review before enabling a crawler. [4] [5]

[Opportunity Desk](https://opportunitydesk.org/) is not enabled. Its robots file explains that the `search` content signal controls collection for search-result use, while an absent signal neither grants nor restricts permission. Since the planned product is searchable, obtain explicit permission or a suitable signal before adding this source. Its disclaimer also tells readers to verify details with the original provider. [6] [7]

The sources reviewed did not establish a content-reuse license for republishing full descriptions. Stage 1 therefore keeps output local, limits summaries, preserves source links and marks every result for review. Before public display, a reviewer must confirm the official application link, eligibility, deadline and status against the originating provider.

## Remaining stages

Stage 1 is implemented and tested. Stage 2's separate Express/MySQL API, additive schema migration, Preview behavior and published container are implemented and verified; unauthenticated API routes are reachable while the project landing page remains owner-only. Remaining work includes the compliant multi-source ingestion/upsert path, configurable daily scheduling, expiration processing, authenticated admin review and source/category management, operational history/log endpoints, and connecting the existing GitHub Pages UI to the API. Those later stages must preserve the public-only-active-reviewed rule and must not change Pages configuration without a separate explicit request.

## References

[1]: https://opportunitiesforyouth.org/robots.txt "Opportunities for Youth robots file"
[2]: https://opportunitiesforyouth.org/ "Opportunities for Youth homepage"
[3]: https://opportunitiesforyouth.org/2026/11/20/up-to-6-fully-funded-phd-positions-in-economics-at-the-university-of-gothenburg-sweden-2027/ "Opportunities for Youth sample listing"
[4]: https://www.youthop.com/ "Youth Opportunities homepage"
[5]: https://www.youthop.com/robots.txt "Youth Opportunities robots file"
[6]: https://opportunitydesk.org/robots.txt "Opportunity Desk robots file"
[7]: https://opportunitydesk.org/disclaimer/ "Opportunity Desk disclaimer"
