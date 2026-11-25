# Mulembe Union multi-page redesign plan

## Implementation

Keep the current repository, official emblem and dependency-free HTML/CSS/JavaScript stack. Maintain authored page fragments and route metadata in `src/`; a small Python standard-library generator wraps each fragment in a shared, semantic page shell and emits direct-access root routes (`index.html`, `about.html`, `leadership.html`, `updates.html`, `events.html`, `budget.html`, `documents.html`, `members.html`, `gallery.html` and `contact.html`). GitHub Pages is configured to serve the repository's `main` branch root, so committed root-level output is published at the existing URL. Keep links and assets relative so all routes work under the repository subpath. The existing proposed-budget JSON/CSV remains the source for the budget page. The GitHub Actions workflow builds the pages, validates their content and links, and checks JavaScript syntax; branch-root Pages handles publication.

Use shared `styles.css`, `app.js` and a small same-origin SVG icon sprite. The desktop shell has a persistent section sidebar and utility header; mobile has a five-item bottom navigation and an accessible drawer for the remaining routes. Every route is fully rendered in HTML (not dependent on JavaScript), has its own title/description and active navigation state, and can be loaded directly. JavaScript is limited to mobile navigation, global public-page search, budget-chart switching, the current year and a restrained page-entry transition. Honor keyboard operation, visible focus, reduced-motion preferences and safe external-link attributes.

Preserve all known union content and disclose its status: role-only leadership; no unverified notices or scheduled events; proposed budget figures only, actual financials unknown and source PDF unavailable; no member self-registration, fake login, OTP, admin or voting; no contact details unless supplied. The Gallery is an honest empty state until approved photos are provided. Integrate the user-provided Facebook page only as direct external links; do not scrape or invent a feed, posts, followers or events.

## Design

**Movement:** heritage-inspired editorial design expressed through a restrained mobile-app shell. **Core principles:** identity without clutter; source-aware public information; persistent, predictable navigation; accessible touch and keyboard interaction. **Color philosophy:** the existing union gold (`#ffd700`) is the signature color for identity and action, balanced by ink, warm paper and muted olive neutrals. **Layout paradigm:** desktop section rail plus a flexible reading workspace; on phones, a compact app header, single-column cards and fixed bottom navigation with safe-area padding. **Signature elements:** the preserved union crest; small gold section markers; editorial cards with quiet borders and purposeful status pills. **Interaction:** actions are links or native buttons with explicit status; menus/search are keyboard dismissible; no fake member transaction surfaces. **Animation:** brief low-distance page entrance and drawer motion only, disabled under reduced-motion preferences. **Typography:** Manrope for headings and DM Sans for interface/body, with system sans-serif fallbacks. **Brand essence:** a clear, trustworthy digital home for University of Embu Mulembe students; *grounded, welcoming, accountable*. **Voice:** direct, warm, factual. Example lines: “Rooted in culture. Rising together.” “Follow the union’s Facebook page for official updates.” **Logo:** keep using the supplied official JPEG without edits; do not create a replacement. **Brand color:** union gold `#ffd700`.

## File structure

- `src/template.html`: shared static page shell and SEO/accessibility metadata slots.
- `src/pages.json`: page routes, titles, navigation labels and searchable keywords.
- `src/pages/*.html`: authored, server-rendered content fragments for each route.
- `scripts/build_site.py`: generate the static root-level HTML pages without third-party packages.
- `assets/icons.svg`: same-origin icons for navigation and the supplied Facebook link.
- `index.html` and other root `.html` files: generated, GitHub Pages-direct routes.
- `styles.css`, `app.js`: shared responsive design system and progressive enhancement.
- `scripts/check_site.py`: validate generated routes, navigation, links, budget data and source-status disclosures.
- `.github/workflows/pages.yml`: build and validate the root output before the branch-root Pages publisher serves it.
