# Global Opportunities Aggregator: architecture and Stage 1

## Existing deployment boundary

The current MULEMBE Union site is generated as static HTML and served from the repository root on GitHub Pages. Pages can continue serving the public interface, but it cannot run the requested Express server, durable database, authenticated moderation tools or a reliable application-owned daily worker. This first stage therefore adds an isolated Node.js command-line scraper. It does not change the live pages, route list, deployment source or publication settings.

The intended full architecture is a static Opportunities page on the existing site that reads approved listings from a separate REST API. A Node.js/Express backend will own the database, validation and review workflow. A daily job will run in the selected backend/worker environment. An authenticated admin interface will review pending records and manage sources and categories. The public page will receive only approved listings. Phase 1 remains scraping-only; no search API, Google API or other external search API is included.

Before the API/database/scheduler stage, the hosting path must be selected. A separate hosted backend can meet the Express, database and admin requirements while preserving GitHub Pages for the public interface. A GitHub Actions plus static JSON/PR-review path could avoid a persistent API host, but it would not provide the requested Express API, production database or authenticated admin dashboard. No migration or host has been selected in Stage 1.

## Project structure

```text
opportunities/
  scraper/
    package.json                     # isolated Node package and commands
    src/
      cli.mjs                         # manual entry point and run summary
      crawl.mjs                       # robots checks, rate limits, retries, HTML fetch
      parse.mjs                       # card/detail extraction and category mapping
      normalize.mjs                   # stable IDs, canonical links, deduplication
      store.mjs                       # local pending-output merge; no publication
      sources/
        opportunities-for-youth.mjs  # first source and allowed listing URLs
    test/
      fixtures/listing.html           # synthetic fixture; no copied full article
      scraper.test.mjs                # parser, URL and dedupe tests
    out/                              # generated pending records; ignored by Git

src/pages/                            # existing static site; future public UI integration
opportunities/api/                    # later: Express REST API and moderation auth
opportunities/database/               # later: migrations and production records
opportunities/scheduler/              # later: daily job owned by selected runtime
opportunities/admin/                  # later: authenticated review/source/log tools
```

Stage 1 uses Node's built-in `fetch`, `node:test` and `node:assert`; Cheerio 1.2.0 parses HTML and `robots-parser` 3.1.1 evaluates robots rules. Requests are sequential, use a transparent project User-Agent, have bounded retries and timeouts, and stop rather than bypass authentication, CAPTCHAs, paywalls or anti-bot interstitials. The CLI writes short summaries and source links to a Git-ignored local JSON file. Duplicate listing URLs receive stable IDs; every record remains `pending_verification` and is never automatically published.

## Source selection

The first adapter is [Opportunities for Youth](https://opportunitiesforyouth.org/). Its current `robots.txt` has a catch-all rule that disallows administrative/search paths but does not disallow the ordinary public listing/article URLs used by this prototype. It also names specific AI crawlers as disallowed; this scraper is a deterministic, clearly identified collector and will not impersonate those crawlers. The rules are fetched and checked again at runtime, and a disallowed or unavailable robots file stops the run. The source homepage exposes opportunities across regions and several relevant categories. A sample listing presents host/location, funding, deadline and eligibility information and links onward to provider pages. Those details are leads, not verified claims; the scraper retains a concise excerpt and source URL, and leaves application-link candidates for human review. [1] [2] [3]

[Youth Opportunities](https://www.youthop.com/) is a possible next source because its public categories span scholarships, fellowships, jobs, volunteering, conferences, training and other programs, and its robots file does not block ordinary pages. Its terms/reuse policy still needs review before enabling a crawler. [4] [5]

[Opportunity Desk](https://opportunitydesk.org/) is not enabled in Stage 1. Its robots file explains that the `search` content signal controls collection for search-result use, while an absent signal neither grants nor restricts permission. Since the planned product is searchable, obtain explicit permission or a suitable signal before adding this source. Its disclaimer also tells readers to verify details with the original provider. [6] [7]

The sources reviewed did not establish a content-reuse license for republishing full descriptions. Stage 1 therefore keeps output local, limits summaries, preserves source links and marks every result for review. Before public display, a reviewer must confirm the official application link, eligibility, deadline and status against the originating provider.

## Stage boundaries

Stage 1 delivers one compliant source adapter, extraction/normalization, local deduplication, tests and a manual CLI run. It does not yet cover every category/source, persist records across machines, schedule daily runs, serve an API, publish listings or provide an admin UI. Those stages depend on a durable runtime and database decision. The scraper's extracted dates, eligibility and application destinations remain unverified until an administrator checks the provider.

## References

[1]: https://opportunitiesforyouth.org/robots.txt "Opportunities for Youth robots file"
[2]: https://opportunitiesforyouth.org/ "Opportunities for Youth homepage"
[3]: https://opportunitiesforyouth.org/2026/11/20/up-to-6-fully-funded-phd-positions-in-economics-at-the-university-of-gothenburg-sweden-2027/ "Opportunities for Youth sample listing"
[4]: https://www.youthop.com/ "Youth Opportunities homepage"
[5]: https://www.youthop.com/robots.txt "Youth Opportunities robots file"
[6]: https://opportunitydesk.org/robots.txt "Opportunity Desk robots file"
[7]: https://opportunitydesk.org/disclaimer/ "Opportunity Desk disclaimer"
