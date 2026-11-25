# MULEMBE Union Global Opportunities API — Stage 2

This package is the backend source of truth for the separately hosted API. It is intentionally separate from the existing GitHub Pages site and does not change that site's build, routes, or publishing configuration.

## Delivered scope

The service is a JavaScript/Node.js 22 Express API backed by managed MySQL. It exposes public read-only endpoints, a liveness check, a database readiness check, structured request/error logs, bounded query validation, exact-origin CORS, and per-instance rate limiting. The existing GitHub Pages site consumes the list and detail GET endpoints from its Opportunities page; the API itself remains read-only. No write, ingest, admin, authentication, or scheduler endpoints exist yet. The database starts without sample listings, so the public feed is empty until a reviewed ingestion workflow is built.

Public records are returned only when `status = 'active'`, `verified_at` is set, and a date deadline has not passed. Internal review notes, verification flags, candidate application URLs, source-management data, and suspicious-listing flags are not selected into public responses. A reviewer workflow must set the verified fields; discovery alone never publishes a record.

## HTTP endpoints

- `GET /api/health` — unauthenticated liveness response; does not depend on MySQL.
- `GET /api/ready` — unauthenticated readiness response; checks a live MySQL connection and returns `503` when the database is unavailable.
- `GET /api/v1/opportunities` — paginated approved listings. Optional query parameters: `q`, `category`, `country`, `deadlineBefore` (`YYYY-MM-DD`), `remote` (`true`/`false`), `page` (1–10,000), and `pageSize` (1–50). `country` currently performs a case-insensitive partial match against the stored location text; country normalization is a later ingestion task.
- `GET /api/v1/opportunities/:id` — one approved listing by its 64-character SHA-256 ID. Unapproved, expired, or unknown records all return `404`.

The current categories align with Stage 1: `jobs`, `scholarships`, `fellowships`, `grants_funding`, `volunteering`, `technology`, `courses_training`, `entrepreneurship_startups`, `conferences_programs`, and `other`. The `conferences_programs` category includes international programs, matching the existing scraper's normalized value.

## Local commands

Use Node.js 22 and npm 10.9.9. Do not put a real connection URL in this repository.

```sh
npm ci
npm test
```

The tests use synthetic in-memory repository responses and schema-file inspection only. They do not connect to MySQL, create rows, or seed the shared database.

Database operations are deliberately separate from server startup:

```sh
npm run db:inspect  # read-only table/column metadata; no application rows
npm run db:status   # read-only migration-history check
npm run db:migrate  # applies only unapplied additive CREATE TABLE migrations
```

Before the first migration, inspect the existing table/column metadata and migration status. `db:migrate` creates the migration ledger plus the tables in `migrations/`; it creates no sample/source/listing rows and contains no `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, or data-seeding statement. Development and published containers share the same managed database.

`DATABASE_URL` is consumed only at runtime. MySQL TLS verification is enabled by default and is required in production. `MYSQL_SSL=false` is rejected in production and is only intended for an isolated local development database. `CORS_ALLOWED_ORIGINS` defaults to the existing Pages origin (`https://isaacnyongesa459-jpg.github.io`); configure exact additional origins only when needed. `PORT` defaults to `3000`; the server listens on `0.0.0.0`.

## Separate WebDev deployment workspace

The API source is maintained in this repository under `opportunities/api/`. The WebDev backend project is a separate workspace, not a GitHub Pages branch or directory. Synchronize the package explicitly, without copying local dependencies/secrets and without deleting unrelated workspace files:

```sh
rsync -a --exclude='node_modules/' --exclude='.env' --include='.env.example' --exclude='.env.*' \
  /home/ubuntu/uoemmulembe/opportunities/api/ /home/ubuntu/mulembeapi/
```

The deployment copy has its own WebDev-managed Git/checkpoint history. A change is not deployed merely because it was committed or pushed to the existing GitHub repository. The current container uses the committed `Dockerfile`; WebDev's unauthenticated readiness path is `/api/ready`.

## Work intentionally left for later

The separately approved backend foundation does not yet include compliant multi-source scheduled scraping, the ingestion/upsert path, expiration jobs, admin authentication/authorization, review actions/history endpoints, source/category management endpoints, or manual run controls. These features remain pending rather than being represented as complete. The public Pages UI is delivered separately and consumes only the read-only public API.
