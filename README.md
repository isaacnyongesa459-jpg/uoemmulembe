# UOEM Mulembe Union website

A responsive, app-like, multi-page public information website and installable Progressive Web App (PWA) for the University of Embu Mulembe Union. The existing official emblem (`IMG-20261124-WA0001.jpg`) is preserved and reused, including for generated PWA app icons. The site remains dependency-free HTML, CSS and vanilla JavaScript; a small Python standard-library script generates ten direct-access HTML routes from the shared shell and page fragments.

## Run locally

From the repository root, generate the public pages and start a static file server:

```sh
python3 scripts/build_site.py
python3 -m http.server 8000
```

Open <http://localhost:8000>. Direct routes include `about.html`, `leadership.html`, `updates.html`, `events.html`, `budget.html`, `documents.html`, `members.html`, `gallery.html` and `contact.html`. All page and asset links are relative for the repository's GitHub Pages subpath.

## Pages and features

- Dashboard home, About the Union, role-labeled Leadership portraits, News & Updates, Events & Activities, Proposed Budget, Documents & Reports, Members & Welfare, Gallery, and Contact.
- Persistent desktop page navigation, a mobile bottom tab bar and an accessible mobile route drawer.
- Public-page search, budget breakdown switching, keyboard shortcuts, responsive cards, safe Facebook links, keyboard focus styles and reduced-motion support.
- Leadership cards show the supplied Chairperson, Secretary and Treasurer portraits; the University of Embu Male Delegate is recognized in a separate, clearly non-executive subsection. The gallery opens the original full-size portraits in a new tab.
- The supplied `BUDGET (1).PDF` is embedded on the budget page and has direct view/download links. The separate charts and CSV/JSON remain brief-derived proposed figures.
- Installable PWA manifest, app icons generated from the preserved logo, standalone launch mode and a service worker that caches the public pages, supplied images, budget booklet and essential assets for offline use.
- Direct HTML routes remain rendered and readable without JavaScript; JavaScript progressively enhances navigation, search and budget visualization.
- The supplied Facebook page is linked directly. No Facebook feed, posts, follower counts or engagement metrics are fabricated.

## Source and security limitations

The original seven-page 2026/27 proposed-budget booklet is preserved unchanged as `BUDGET (1).PDF`. Website charts and CSV/JSON values remain a separate summary transcribed from the project brief and have not been recalculated from the full booklet; figures are proposed only, while actual income, expenditure and balance remain unknown. Portraits were supplied for the Chairperson, Secretary, Treasurer and University of Embu Male Delegate, but personal names were not supplied. The delegate is explicitly not presented as a MULEMBE Union executive official. No event dates, approved notices, or official email/phone details were supplied. Contact/social details include only the provided Facebook page.

The public site has no member database, self-registration, authentication, password reset, SMS/OTP, admin controls, secure financial ledger, private document store, welfare-case system or voting system. It includes readiness/status information only. Do not submit member credentials, student identifiers or sensitive welfare details. See [`docs/platform-architecture.md`](docs/platform-architecture.md) before building private member functions.

## Install on Android

Open the [live website](https://isaacnyongesa459-jpg.github.io/uoemmulembe/) in Chrome on Android. Use the on-page **Install app** prompt if it appears, or open Chrome’s menu (⋮) and choose **Install app** or **Add to Home screen**. Confirm the prompt, then launch **UOEM Mulembe** from the home screen. The first visit and app-shell download need an internet connection; after caching, the public routes and included booklet/photos are available offline. External Facebook and web-font content still require internet access.

## Build and checks

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check app.js
node --check service-worker.js
```

GitHub Pages serves the generated root-level files from `main` at `/`. The GitHub Actions workflow builds and validates all routes, assets, disclosures and JavaScript syntax on each push; Pages itself publishes the branch-root files.

## Live website

The website is live at <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. A live smoke test returned HTTP 200 for all ten direct routes and all six required site assets. See [`docs/deployment.md`](docs/deployment.md) for the confirmed Pages source, the successful initial workflow deployment and the reason the redundant deploy job was removed.
