# UOEM Mulembe Union website

A responsive, app-like public information website and installable Progressive Web App for the University of Embu Mulembe Union. The existing official emblem is preserved. The site uses dependency-free HTML, CSS, vanilla JavaScript and a Python standard-library generator to produce eleven direct-access GitHub Pages routes from the shared shell and page fragments.

## Run locally

From the repository root, generate the public pages and start a static server:

```sh
python3 scripts/build_site.py
python3 -m http.server 8000
```

Open <http://localhost:8000>. Direct routes include About, Leadership, News & Updates, Events & Activities, Gallery, Proposed Budget, Documents, Members, Donations and Contact, as well as Home. Links are relative to the repository's `/uoemmulembe/` GitHub Pages path.

## Pages and features

- Home dashboard; a historically factual About page; role-labeled Union leadership; separate University delegate recognition; verified-information states for News and Events; Members; Gallery; Budget; Documents; Donations; and Contact.
- Compact mobile Home/Union/Events/Members/More navigation, a searchable desktop/sidebar route list and an accessible More drawer.
- A repository-wide photo manifest at `data/gallery-manifest.json` lists all 17 uploaded photographs. Branding and app-icon files are excluded. Cards are filterable by defensible category, lazy-loaded, fully proportional and open in a full-screen viewer with close and previous/next controls. The static generator emits usable image cards without JavaScript.
- The Gallery and Leadership pages preserve the exact supplied Chairperson, Secretary, Treasurer and University delegate assignments. The delegate remains a separate University of Embu recognition and is explicitly not a MULEMBE Union executive official. No personal names or unprovided event details are invented.
- The About page states the 2016 foundation, respectfully acknowledges only the supplied challenges, names the exact 18 Luhya subtribes, and gives the requested shared-unity message, vision, mission and core values.
- **Support MULEMBE Union** presents M-Pesa, KSh 100/200/500/1,000/2,000 suggestions, a custom amount, Kenyan phone input and payment-status area. It is clearly **not connected** and performs no request while `data/donation-client-config.json` remains disabled with an empty endpoint. It never asks for a PIN or simulates success. See [`docs/daraja-integration.md`](docs/daraja-integration.md) for the versioned future STK Push contract and secure backend requirements.
- The original `BUDGET (1).PDF` remains unchanged and viewable/downloadable; proposed summary data remains separate and actual financials unknown.
- The PWA retains logo-derived icons, standalone Android installation and a service worker that caches the routes, manifest, all listed photos and essential documents/data for offline use.
- Public-page search, budget visualization, keyboard focus, reduced-motion support and safe external Facebook links are retained.

## Source and security limitations

The public Pages site has no payment backend. Do not activate donations until a secure HTTPS backend, server-only Daraja credentials, provider callback verification, durable transaction records, idempotency/abuse controls and sandbox/live testing are implemented. Never put Consumer Keys, Consumer Secrets, Passkeys or an M-Pesa PIN in the frontend or repository. A client-side status is only as trustworthy as the secure backend; verified callbacks and reconciliation must decide success.

The supplied seven-page proposed-budget booklet is preserved byte-for-byte. Website charts and CSV/JSON remain a separate brief-derived proposal summary; actual income, expenditure and balance remain unknown. No member database, self-registration, authentication, private welfare submissions, administration or voting is enabled. No Facebook feed or unverified events/notices are fabricated.

## Install on Android

Open the [live website](https://isaacnyongesa459-jpg.github.io/uoemmulembe/) in Chrome on Android. Use **Install app** if it appears or choose **Install app** / **Add to Home screen** from Chrome’s menu. After the first online visit and PWA cache installation, the public routes, gallery photos, budget booklet and essential data are available offline. External Facebook and web-font content still require an internet connection.

## Build and checks

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check app.js
node --check service-worker.js
```

GitHub Actions runs the build, site validator and JavaScript syntax checks. GitHub Pages serves committed root-level files from `main` at `/`.

## Live website

<https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. See [`docs/deployment.md`](docs/deployment.md) for the confirmed Pages publishing model and deployment verification.
