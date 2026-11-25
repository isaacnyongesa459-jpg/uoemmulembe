# GitHub Pages deployment status

## Verified live website

The redesigned website is live at <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>. GitHub's Pages API reports the existing source as `main` at `/` (`build_type: legacy`), and the public URL serves the generated HTML and assets from that root.

After the redesign was pushed, a direct HTTP smoke check received status 200 for all ten routes (`index.html`, `about.html`, `leadership.html`, `updates.html`, `events.html`, `gallery.html`, `budget.html`, `documents.html`, `members.html`, `contact.html`) and all six required assets (CSS, JavaScript, logo, icon sprite and budget JSON/CSV). Titles and the exact supplied Facebook destination were verified on every route.

- Website: <https://isaacnyongesa459-jpg.github.io/uoemmulembe/>
- Repository: <https://github.com/isaacnyongesa459-jpg/uoemmulembe>
- Pages settings: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/settings/pages>
- Actions workflow: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/workflows/pages.yml>
- Successful initial redesign run, including `Deploy site`: <https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45608739113>

## Publishing model

GitHub Pages is configured to publish the repository's `main` branch root. Committing generated root-level HTML, CSS, JavaScript, image, icon and data files updates the public website. The Actions workflow therefore builds and validates the static routes but does not run a second `actions/deploy-pages` publication.

An earlier workflow revision attempted both branch-root publishing and a separate Actions deployment. The initial redesign run [45608739113](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45608739113) deployed successfully; on the subsequent documentation-only run [45609161369](https://github.com/isaacnyongesa459-jpg/uoemmulembe/actions/runs/45609161369), validation succeeded but `Deploy site` failed after creating a deployment with `Deployment failed, try again later`, including on retry. The branch-root Pages site continued serving the redesigned routes. To align the workflow with the configured Pages source and avoid duplicate publishers, the workflow now keeps build, site validation and JavaScript syntax checks only.

If the repository administrator later changes Pages **Build and deployment → Source** from the main-branch root to **GitHub Actions**, update the workflow to use a Pages artifact and deployment job at the same time.

## Published files

The committed root output includes all ten generated routes, `styles.css`, `app.js`, the preserved emblem, `assets/icons.svg` and the proposed-budget JSON/CSV. The Python generator and check use only the standard library. The published site has no private member backend, registration, authentication, confidential welfare submission, administration or voting features.
