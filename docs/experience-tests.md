# Reader experience checks

Run `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build` first. `pnpm test:experience` exercises the production browser interface at desktop and narrow widths; `pnpm test:motion` records route state, animation events, browser errors and Chromium screencast frames for normal, reduced-motion and unsupported View Transitions paths. Both use the bundled feed and a controlled substitute for remote images. They do not test the availability or appearance of remote media.

`pnpm test:visual` records the eight current styles (`folio`, `y2k`, `pop`, `newsprint90s`, `synthwave`, `nocturne`, `editorial`, `wabi`), both registered variants per style, two color schemes, and list/detail views at 1280×900 and 390×844 (64 rendered views). The current mode checks visible list and issue anchors, overview jumps that land below the sticky header, outbound source links in the article body, decoded bundled-substitute images, narrow-page overflow, reduced-motion decorations, browser errors and per-view layout/image metrics. It runs against the current production build with no historical target. Historical five-style comparison remains separate and uses its original five styles (`card`, `y2k`, `pop`, `newsprint90s`, `dreamcore`); it only accepts a pair: `AI_NEWS_OLD_DIST` must point to an old site dist containing `ai-news/` and `AI_NEWS_PRE_THEME_DIST` must point to an independent AI News web dist built from pre-theme commit `616762f47cdda11a82e03142462564db462846b9`. The new themed build is never used as the historical comparison target.

`pnpm test:juya-folio` also exercises keyboard navigation, unresolved overview titles, source links in new tabs, late-loading images above the jump target, and a single browser Back after multiple jumps.

Build the explicit web baseline in a separate worktree (choose a path that does not already exist):

```powershell
$baseline = 'C:\work\ai-news-pre-theme'
git worktree add $baseline 616762f47cdda11a82e03142462564db462846b9
Push-Location $baseline
pnpm install --frozen-lockfile
pnpm build
Pop-Location
```

Then run the historical pair and pixel comparison from the themed worktree:

```powershell
$env:AI_NEWS_OLD_DIST = 'C:\work\old-site-dist'
$env:AI_NEWS_PRE_THEME_DIST = Join-Path $baseline 'dist'
$env:AI_NEWS_EVIDENCE = 'C:\work\ai-news-historical-evidence'
pnpm test:visual
pnpm exec node tests/compare-matrix.mjs $env:AI_NEWS_EVIDENCE
```

Both comparison commands fail fast unless both distinct dist roots are set. The historical run captures 40 pairs and reports pixel differences, dimensions, text, layout metrics, title and refresh state. It expects the previously approved old-disabled/pre-theme-enabled refresh difference; it does not declare the images pixel-identical. `pnpm test:visual-config` verifies missing-target, identical-target, and missing-compare-input refusals.

`AI_NEWS_EVIDENCE` selects the output directory for each test. These scripts start isolated local servers and browser contexts, use a fixed clock and the same snapshot, and do not use a personal browser profile. `AI_NEWS_MUTATE_FEED=1 pnpm test:experience` deliberately removes one feed item at the external response boundary: the expected ten-item count must fail, demonstrating sensitivity of the count assertion.

`AI_NEWS_HOLD_TRANSITION=1 pnpm test:motion` adds a controlled browser transition timing: delay the first callback, navigate back, release it, and revisit the same detail before the old transition finishes. The visible list and detail are the assertions; trace events and screenshots document the sequence. `AI_NEWS_OLD_DIST` can also be supplied to reproduce the old behavior for comparison.
