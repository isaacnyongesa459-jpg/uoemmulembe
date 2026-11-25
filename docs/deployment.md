# GitHub Pages deployment

## Website and repository

- Website: <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>
- Repository: <https://github.com/isaacnyongesa459-jpg/uoemmulembe>
- Pages settings: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages>
- Actions validation: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/workflows/pages.yml>

GitHub Pages is configured to serve the `main` branch root (legacy source). Committed root-level HTML, styles, scripts, data and image assets update the public site. The repository's Actions job builds and validates the static pages; it does not start a second `actions/deploy-pages` publisher. If the repository administrator changes the Pages source to GitHub Actions, the workflow and source setting must be changed together.

The shared template, route metadata and page fragments live under `src/`. Run `python3 scripts/build_site.py` to generate the eleven root-level routes. Paths remain relative to the repository's `/uoemmulembe/` subpath.

## Gallery and PWA

`data/gallery-manifest.json` is the curated, committed image list required by static hosting. It covers the 17 discovered uploaded photographs across the repository, with branding/app-icon files excluded. The validator requires exact correspondence between this manifest and repository photo files, rejects exact duplicate image content, verifies supplied role mappings and ensures the generated page includes every photo once. The build emits image cards so the gallery remains useful without JavaScript; JavaScript adds category filters and the accessible full-screen lightbox.

The service worker cache was revised for the Donations route, gallery manifest, disabled donation configuration and all 17 gallery photographs. The donation configuration is fetched network-first while online and falls back to its last cached copy offline, so an endpoint/configuration change is not indefinitely masked by a stale shell cache. The PWA still serves the site under `/uoemmulembe/`, using relative manifest paths and standalone display. As with any offline shell, the first successful online installation is needed before offline viewing. Very large original photographs increase first-install download size; originals are deliberately kept unchanged.

## M-Pesa processing is not connected

The donation UI is deliberately inactive on GitHub Pages: `data/donation-client-config.json` has `enabled: false` and an empty endpoint, so the client sends no donation request and does not simulate success. See [`daraja-integration.md`](daraja-integration.md) for the request/response contract and required backend security work. A static-site deployment cannot hold Daraja secrets, securely initiate STK Push or verify callbacks. Do not set the client enabled flag until a secure HTTPS backend exists, is configured and has passed provider sandbox and operational testing.

## Preserved content

The generator does not transform supplied original photos or the budget booklet. The validator checks the booklet's original SHA-256, proposal totals and actuals-unknown state, supplied leadership-to-role mappings, the distinct University delegate boundary, the complete supplied 18-name About section, route/navigation links, icon assets and PWA cache resources.

## Verification

Before publication, build and run:

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check app.js
node --check service-worker.js
```

Browser checks should include the direct routes at phone/tablet/desktop widths, category filters, full-size dialog controls, donation input/inactive response with network inspection confirming no request, budget PDF links, service-worker activation/cache, and offline route/image access. Live Pages availability and the Actions run must be verified after pushing; local checks alone do not prove publication.
