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

The committed root output includes all ten generated routes, `styles.css`, `app.js`, `manifest.json`, `service-worker.js`, the preserved emblem, logo-derived PWA PNG icons, the four requested portraits, the unmodified `BUDGET (1).PDF`, the shared icon sprite and the proposed-budget JSON/CSV. The manifest and service-worker scope use relative `./` paths so they remain inside the repository's `/uoemmulembe/` Pages path. The worker pre-caches the public routes and essential supplied materials; external Facebook and web-font resources remain online-only. The Python generator and validator use the standard library. The published site has no private member backend, registration, authentication, confidential welfare submission, administration or voting features.

## PWA installation and offline behavior

Android visitors can open the site in Chrome and select the on-page **Install app** prompt when available, or use the browser menu to choose **Install app** / **Add to Home screen**. The manifest launches the site in standalone mode. After the first successful cache install, all ten public routes, the four supplied photos, the budget booklet, logo/icons and budget data are available offline. The browser may need a first online load to install and populate the service worker cache.


## Verification for the portrait, booklet and PWA update

The generated site and validator passed before publication. A Chromium/Playwright run served the repository under the same `/uoemmulembe/` path used by GitHub Pages. Home, leadership, gallery, budget and documents pages were checked at 390px, 768px, 1024px and 1440px widths with no horizontal overflow. The three supplied executive portraits and the separately labeled University delegate loaded; all four gallery images opened at their original JPEG URLs. Budget income/allocation switching, the embedded PDF path, the exact view/download controls and the `BUDGET (1).PDF` download filename were checked.

The service worker activated with scope `/uoemmulembe/` and populated 26 same-origin app-shell resources, including all ten routes, the four portraits, logo/icons, proposal data and original PDF. With Chromium taken offline after installation, the leadership route and budget page reopened and the cached portrait files and PDF remained fetchable. The four supplied JPEGs, `BUDGET (1).PDF` and existing emblem were also hash-compared with the upload commit `1379e6a`; all matched. Responsive, route and browser behavior were tested locally; Android's actual install UI still depends on a compatible browser and a successful HTTPS visit to the live Pages site.
