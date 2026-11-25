# GitHub Pages deployment status

## Verified live deployment

The redesigned website is live at <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. Commit `d942f204cc381b46c76cc782595dec313be17a51` completed the [Validate and deploy UOEM website workflow](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45608739113) successfully, including validation, Pages configuration, artifact assembly/upload and the `Deploy site` step.

After deployment, a direct HTTP smoke check received status 200 for all ten routes (`index.html`, `about.html`, `leadership.html`, `updates.html`, `events.html`, `gallery.html`, `budget.html`, `documents.html`, `members.html`, `contact.html`) and all six required assets (CSS, JavaScript, logo, icon sprite and budget JSON/CSV). Page titles and the exact supplied Facebook destination were also verified on each route.

GitHub's Pages API continues to report source `main` at `/` with `build_type: legacy`. The successful Actions deployment and live route checks confirm the redesigned pages are served at the expected subpath URL. Keep relative page and asset paths so the site remains compatible with the repository path.

- Website: <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>
- Repository: <https://github.com/isaacnyongesa459-jpg/uoemmulembe>
- Pages settings: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages>
- Deployment workflow: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/workflows/pages.yml>
- Successful redesign run: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45608739113>

## Historical setup attempts

Before the Pages site was initialized, run [45603243307](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45603243307) passed validation but failed in `actions/configure-pages` with `Not Found` and `Resource not accessible by integration`; the older [45598014737](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45598014737) also failed to deploy. Those are superseded by the successful run above.

## Published artifact

The validation job builds and checks all ten direct HTML routes, navigation, local links and assets, Facebook URL consistency, proposal-only disclosures, budget arithmetic and JavaScript syntax. The deployment job packages all generated root HTML pages, `styles.css`, `app.js`, the preserved emblem, `assets/icons.svg` and the existing proposed-budget JSON/CSV files.
