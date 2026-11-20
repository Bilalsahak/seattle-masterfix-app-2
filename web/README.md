# Seattle MasterFix App — portable web version

Standalone, portable test version of the Seattle MasterFix customer app,
built for GitHub Pages. It mirrors the app in the repo root (the Muse
TypeScript-space source) — same 5 tabs, same services, same estimate flow,
same job tracking — but with no server and no Muse-only dependencies.

## Live test

https://bilalsahak.github.io/seattle-masterfix-app-2/

GitHub Actions builds this folder (`web/`) and deploys it to GitHub Pages
on every push to `main` (see `.github/workflows/pages.yml`).

**Pages must be enabled first:** in the repo go to Settings → Pages →
Build and deployment → Source: **GitHub Actions**. Until that is set, the
workflow will fail to deploy.

## What works online

- Home, Services (7 trades, included / excluded, cost drivers, no fixed
  prices), Projects (filterable gallery), My Job, More (pricing guidance,
  service-area ZIP check, FAQs, contact, office tools)
- 4-step estimate request — service → the work → photos → contact/review —
  with a reference number (`SMF-REQ-…`) and a lead inbox under
  More → Office tools
- Job tracking — milestones with real percent-complete, dated crew updates,
  documents, change orders approved / declined in writing, payments status
  from the signed estimate only, per-job messages, notifications, and the
  1-year labor warranty section after completion

## What is localStorage-only (test version)

There is no server in this version. All estimate requests, jobs,
milestones, updates, documents, change orders, payments, messages, and
notifications are stored in **your own browser's localStorage**
(key `smf-app-v1`). That means:

- It works for testing on your own phone / computer, but another person
  opening the Pages link sees an empty app — they do not see your test data.
- Nothing you enter is sent anywhere. No emails are sent.
- Clearing the browser's site data resets the app to empty.
- Uploaded photos / documents are stored as data URLs in localStorage
  when small enough (under ~800 KB); larger files are recorded by name
  only, with no preview.

The repo-root version is the full server-backed app (Muse space, SQLite).
This `web/` version is for an online test only — it is not the production
system, and it must not be presented to clients as the live app.

## Photos

The 8 project images here are navy/bronze SVG placeholders, labelled as
such — no location is claimed for any of them. The real crew photos are
binary files and are not in this repo. To use real photos, replace the
`.svg` files in `web/src/assets/` with your own images of the same names
and update the imports in `web/src/content.ts` / `web/src/App.tsx`.

## Run it locally

```bash
cd web
npm ci
npm run dev      # then open http://localhost:5173/seattle-masterfix-app-2/
npm run build    # production build into web/dist/
npm run preview
```

Node 20+ required. No Bun, no @hatch/space-sdk, no database to set up.
