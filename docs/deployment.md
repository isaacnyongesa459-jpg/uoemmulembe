# GitHub Pages deployment status

## Current status

The static site and automated validation are committed to `main`. The validation job passed, but the Pages deployment is **not yet available**. At the latest check, `https://isaacnyongesa459-jpg.github.io/uoemmulembe/` returned HTTP 404.

GitHub Actions cannot create the Pages site for this repository. `actions/configure-pages` failed with `Resource not accessible by integration` when it attempted to initialize Pages. The workflow already requests `pages: write` and `id-token: write`, but GitHub still requires the repository owner to initialize Pages once in repository settings.

- Failed deployment run (initial attempt): https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45597891026
- Failed deployment run (after adding automatic enablement): https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45598014737
- Repository Pages settings: https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages
- Deployment workflow: `.github/workflows/pages.yml`

## One-time setup by a repository administrator

1. Open [Repository Settings → Pages](https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Confirm that GitHub Actions are enabled for this repository.
4. Open the [deployment workflow](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/workflows/pages.yml) and select **Run workflow** on `main` (or push another commit).
5. Confirm the `Validate static site` and `Publish to GitHub Pages` jobs both succeed. The deployment environment output should then provide the actual published URL.

The expected project URL is <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. Do not treat it as live until it returns the site rather than the current 404.

The workflow validates HTML fragment links and assets, proposed-budget arithmetic and labels, and JavaScript syntax. Its deployment artifact contains only `index.html`, `styles.css`, `app.js`, the preserved emblem, and the proposed-budget JSON/CSV data.
