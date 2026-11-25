# UOEM Mulembe Union website

A responsive, app-like, multi-page public information website for the University of Embu Mulembe Union. The existing official emblem (`IMG-20261124-WA0001.jpg`) is preserved and reused. The published site remains dependency-free HTML, CSS and vanilla JavaScript; a small Python standard-library script generates the ten direct-access HTML routes from the shared shell and page fragments.

## Run locally

From the repository root, generate the public pages and start a static file server:

```sh
python3 scripts/build_site.py
python3 -m http.server 8000
```

Open <http://localhost:8000>. Direct routes include `about.html`, `leadership.html`, `updates.html`, `events.html`, `budget.html`, `documents.html`, `members.html`, `gallery.html` and `contact.html`. All page and asset links are relative for the repository's GitHub Pages subpath.

## Pages and features

- Dashboard home, About the Union, role-only Leadership, News & Updates, Events & Activities, Proposed Budget, Documents & Reports, Members & Welfare, Gallery, and Contact.
- Persistent desktop page navigation, a mobile bottom tab bar and an accessible mobile route drawer.
- Public-page search, budget breakdown switching, keyboard shortcuts, responsive cards, safe Facebook links, keyboard focus styles and reduced-motion support.
- Direct HTML routes remain rendered and readable without JavaScript; JavaScript progressively enhances navigation, search and budget visualization.
- The supplied Facebook page is linked directly. No Facebook feed, posts, follower counts or engagement metrics are fabricated.

## Source and security limitations

The supplied upload contained the redesign brief, not the original 2026/27 budget PDF. Budget amounts are presented as proposed figures transcribed from the earlier project brief; the JSON/CSV are labelled summaries, not the official PDF. Actual transactions, expenditure and balance are unknown. No leadership names/photos, event dates, approved notices, official email/phone details or gallery photos were supplied. Contact/social details include only the Facebook page provided in the redesign brief.

The public site has no member database, self-registration, authentication, password reset, SMS/OTP, admin controls, secure financial ledger, private document store, welfare-case system or voting system. It includes readiness/status information only. Do not submit member credentials, student identifiers or sensitive welfare details. See [`docs/platform-architecture.md`](docs/platform-architecture.md) before building private member functions.

## Build and checks

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check app.js
```

GitHub Pages serves the generated root-level files from `main` at `/`. The GitHub Actions workflow builds and validates all routes, assets, disclosures and JavaScript syntax on each push; Pages itself publishes the branch-root files.

## Live website

The website is live at <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. A live smoke test returned HTTP 200 for all ten direct routes and all six required site assets. See [`docs/deployment.md`](docs/deployment.md) for the confirmed Pages source, the successful initial workflow deployment and the reason the redundant deploy job was removed.
