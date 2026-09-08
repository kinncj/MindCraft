# Deploying MindCraft to GitHub Pages

MindCraft is a static site. GitHub Pages hosts it for free with no server to maintain.

## One-time setup

1. The repository lives at https://github.com/kinncj/MindCraft
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**

That's it. Every push to `main` runs the **Tests** workflow (unit tests, then the
browser tests). Only when that goes green does `.github/workflows/deploy-github-pages.yml`
run: it checks out the exact commit the tests passed on, builds it, and publishes
`dist/` to Pages. The site appears at `https://kinncj.github.io/MindCraft/`.

A red suite therefore never reaches a child. To publish anyway — a docs-only change,
or a deliberate hotfix — run the deploy workflow by hand (**Actions → Deploy to GitHub
Pages → Run workflow**), which builds whatever is on `main` without waiting for tests.

## How the base path works

GitHub Pages serves project sites from `/<repo-name>/`, not `/`. Vite needs to know that
at build time so asset URLs resolve. `vite.config.ts` handles it:

- Local dev, tests, previews: base is `/`
- The deploy workflow sets `GITHUB_PAGES=true`, which switches base to `/MindCraft/`
  (capital M — it must match the repo name exactly)
- Different repo name? Set `VITE_BASE=/your-name/` in the workflow's build step instead

There is no client-side routing, so no 404 fallback tricks are needed.

## Deploying manually (without Actions)

```bash
GITHUB_PAGES=true npm run build
npx gh-pages -d dist        # or push dist/ to a gh-pages branch by hand
```

Then point Pages at the `gh-pages` branch. The Actions route is less fiddly.

## Checking a deploy

1. The Actions tab shows the `Deploy to GitHub Pages` run
2. Open the site, place a block, reload — the block should still be there
3. Export a world; the JSON file should download

## Rollback

Re-run the deploy workflow from an older commit (Actions → the run → "Re-run all jobs"),
or revert the offending commit on `main` and let the workflow redeploy.
