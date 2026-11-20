# Seattle MasterFix App — web version (Supabase)

Seattle MasterFix customer app, built for GitHub Pages with a Supabase backend. It mirrors the app in the repo root (the Muse
TypeScript-space source) — same 5 tabs, same services, same estimate flow,
same job tracking — but with no server and no Muse-only dependencies.

## Live test

https://bilalsahak.github.io/seattle-masterfix-app-2/

GitHub Actions builds this folder (`web/`) and deploys it to GitHub Pages
on every push to `main` (see `.github/workflows/pages.yml`).

**Pages must be enabled first:** in the repo go to Settings → Pages →
Build and deployment → Source: **GitHub Actions**. Until that is set, the
workflow will fail to deploy.

## How it works now (Supabase version)

- **Visitors**: browse services/projects and send an estimate request with up to 5 photos.
  Photos are stored privately in Supabase; Bill also gets the request by email (Formspree, text only).
- **Clients**: sign in on the My Job tab with their email (sign-in link or 6-digit code, no password).
  They see only their own jobs: schedule, milestones, crew updates/photos, payments (read-only),
  change orders, documents, warranty, and a message thread with the office.
- **Office** (role = office, set by SQL only): request inbox with photos, create a job from a request,
  email the client a sign-in link, update schedule/status, milestones, payments, change orders,
  documents, crew updates, and reply to messages. Office controls are never shown to clients, and the
  database refuses office actions from client accounts even if someone tries.
- Routes use the URL hash (`#/myjob`, `#/job/12`), so Back and refresh work.
- Installable: manifest, service worker (offline app shell; job data is never cached), Android
  install button, iPhone Share → Add to Home Screen steps, 180×180 apple-touch-icon.
- "Sign out and clear this device" in More.

Backend setup, access rules, and the steps Bill must do once are in `../supabase/README.md`.

## Photos & logo

The 8 project images in `web/src/assets/` are the real crew photos
(compressed to WebP: `hero.webp`, `siding.webp`, `fencing.webp`, `tile.webp`,
`flooring.webp`, `drywall.webp`, `paint.webp`, `remodel.webp`) — real work by our crew,
including completed jobs from other states. They are never labelled as
Seattle jobs. The old navy SVG placeholders are still in the folder but
are no longer imported anywhere.

The header and About section use the real Seattle MasterFix logo
(`web/src/assets/logo.svg` / `logo-on-navy.svg`, also copied to
`web/public/logo.svg` as the site favicon and home-screen icon).
Binary files (JPG/PNG) cannot be pushed with the GitHub MCP snapshot
tool — upload them through the GitHub web UI (Add file → Upload files)
if they are ever missing from the repo.

## Design (redesigned 2026-11-20)

Professional, simple, modern, phone-first. Navy #14293F / bronze
#D79A43 / cream #F7F0E3, Inter with Instrument Serif headings.

- Hero image slider: real photos (hero, siding, remodel, tile), auto-
  advance every 5.5s, dots, arrows, touch swipe, slow zoom, pauses on
  hover/touch, and respects `prefers-reduced-motion`.
- Motion: fade/slide tab transitions, reveal-on-scroll sections, card
  hover lifts, visible button press states, animated progress bars,
  smooth FAQ accordion — CSS only, no animation library.
- Interactive: projects as a swipeable snap-scroll carousel with a
  full-screen viewer (prev/next, keyboard arrows, Esc to close, counter),
  services as a horizontal snap-scroll row on phones, labelled
  4-step estimate stepper with animated progress.

## Run it locally

```bash
cd web
npm ci
npm run dev      # then open http://localhost:5173/seattle-masterfix-app-2/
npm run build    # production build into web/dist/
npm run preview
```

Node 20+ required. No Bun, no @hatch/space-sdk. It talks to the hosted Supabase project.
