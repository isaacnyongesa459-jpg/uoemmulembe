# GitHub Pages deployment status

## Current status

The expected website URL is <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. Immediately before the redesign push, it returned HTTP 200. The GitHub Pages API reported `build_type: legacy` with source branch `main` and path `/`. This confirms that the previous deployment was reachable, but does not confirm that a later commit has deployed.

The existing source serves root-level static files, and every new route, stylesheet, script, icon and budget-data URL is relative for the repository subpath. After the redesign push, verify the new homepage and direct routes at the public URL. The GitHub Actions workflow also builds and validates the routes and assembles a Pages artifact; check its new run rather than assuming the workflow's deployment step succeeded.

The last confirmed workflow run before this redesign was [45603243307](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45603243307): validation succeeded, but `actions/configure-pages` failed before artifact upload with `Not Found` while checking for a Pages site and `Resource not accessible by integration` while trying to create one. The previous run is [45598014737](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45598014737). These are historical attempts; verify the latest run for the redesign.

- Repository Pages settings: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages>
- Deployment workflow: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/workflows/pages.yml>
- Repository: <https://github.com/isaacnyongesa459-jpg/uoemmulembe>

## If the Actions deployment needs a source change

The existing `main`-root Pages configuration serves generated root routes directly. If a fresh Actions run confirms that the workflow cannot deploy with this legacy source, a repository administrator can switch **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, then rerun the workflow on `main`. Confirm both **Validate static site** and **Publish to GitHub Pages** succeed and use the deployment environment URL as the published link.

Do not describe the redesign as live until the public URL serves the redesigned homepage. A successful HTTP response to the existing URL alone is not proof that the latest commit has deployed.

## Published artifact

The validation job builds and checks all ten direct HTML routes, navigation, local links and assets, Facebook URL consistency, proposal-only disclosures, budget arithmetic and JavaScript syntax. The deployment job packages all generated root HTML pages, `styles.css`, `app.js`, the preserved emblem, `assets/icons.svg` and the existing proposed-budget JSON/CSV files.
