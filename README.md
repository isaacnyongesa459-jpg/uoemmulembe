# UOEM Mulembe Union website

A responsive, accessible public information website for the University of Embu Mulembe Union. It uses the union's existing official emblem (`IMG-20261124-WA0001.jpg`) and a black, gold and warm-white visual identity. The site is dependency-free: semantic HTML, CSS and vanilla JavaScript.

## Run locally

From the repository root, start any static file server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The budget chart loads the structured dataset at `data/proposed-budget-2026-27.json`; use a local HTTP server rather than opening `index.html` as a `file://` URL.

## Included

- Union identity, mission, vision and values.
- Role-only leadership cards; names/photos have not been verified or supplied.
- Cultural, sport and academic activity areas, clearly marked as areas rather than scheduled events.
- Verified-notice empty state; no invented announcements.
- Accessible, switchable charts for the proposed 2026/27 income and allocations.
- Explicit distinction between a proposal and actual financial transactions/balances.
- Budget/account source-status notice and other document placeholders.
- Elections and member-portal readiness pages that do not collect credentials or pretend to authenticate/vote.
- Keyboard-accessible site search, mobile navigation and reduced-motion support.
- GitHub Actions deployment workflow for GitHub Pages.

## Source documents and limitations

The repository originally contained only the official logo image. The uploaded materials available during implementation contained a project brief twice; the original proposed-budget PDF, constitution, meeting minutes, official contact details, official names and portraits were not available. The figures shown in the dashboard are the proposal amounts quoted in the brief and stored in `data/proposed-budget-2026-27.json`. The JSON is a transcription summary, not the original PDF. Actual financial records are empty and actual totals/balance are explicitly unknown.

The website currently has no backend, member database, authentication, SMS/OTP integration, administrative dashboard, private document storage, welfare case system or election/voting system. It is safe to browse as a public, static information site, but it must not be used to submit private information or as an authenticated union service. See [`docs/platform-architecture.md`](docs/platform-architecture.md) before implementing any private/member operations.

## Checks

Run the repository checks with:

```sh
python3 scripts/check_site.py
node --check app.js
```

A GitHub Actions workflow runs these checks before publishing. Deployment availability depends on repository Pages/Actions settings and the workflow completing successfully.

## Deployment status

The GitHub Pages workflow is committed, but Pages is not yet live: the repository must first be set to use **GitHub Actions** as the Pages build source. See [`docs/deployment.md`](docs/deployment.md) for the verified blocker, workflow run links and one-time setup steps.
