# Seattle MasterFix App

Customer app for **Seattle MasterFix Precision Craftsmanship** — 5415 6th Ave NW, Seattle, WA 98107 — (206) 550-4576 — Bill@seattlemasterfix.com — WA Reg. SEATTMP744NL — UBI 605-904-953.

Clients can browse all the website info in the app, request an estimate, and track their job.

## What it does

- **Home** — hero, trust strip (licensed, WA Reg., reviews), featured services, hours, service area
- **Services** — Siding, Fencing, Tile, Laminate Flooring, Drywall, Interior / Exterior Paint, Remodel Build-Outs. Each service: what's included / excluded, the 4-step process (site visit → written estimate → the work → walkthrough), and cost drivers. **No fixed prices anywhere** — the final price comes from the written estimate.
- **Projects** — filterable photo gallery, honestly labelled (crew photos include work from other states — never labelled as Seattle jobs)
- **Estimate request** — 4 steps, under 3 minutes: service → the work → up to 5 photos → contact / review. Issues a reference number (`SMF-REQ-…`) and lands in the office lead inbox. The app never generates its own price.
- **My Job (tracking)** — status pipeline, milestone timeline with real percent-complete, dated crew updates with before / during / after photos, documents (estimate PDF, signed agreement, invoices, warranty letter), change orders approved / declined in writing, payment status taken only from the signed estimate, per-job messages, notifications, and a 1-year labor warranty section after completion.
- **More** — pricing guidance (cost drivers only), service area, FAQs, contact, office tools (lead inbox, job management)

## Design

Formal corporate / big-GC style, matching the website and estimates: ink navy `#14293F`, bronze `#D79A43` / `#C79248`, bronze light `#F0C785`, cream `#F7F0E3`, charcoal `#1C242E`.

## ⚠️ Security warning about `server/` and `client/` (Muse version)

The Muse code in `server/` and `client/` has **no login and no access checks**: anyone who can reach it could read
every client's name, phone, address, job, payments, and messages, and change them. **Do not deploy it.**
The live app is `web/` with the Supabase backend in `supabase/` (logins + Row Level Security).
Recommendation: delete `server/`, `client/`, and `drizzle/` once the Supabase version is approved.

## How this repo was built

This is the source snapshot of the app built in Muse from the **Seattle MasterFix App — Design & Build Guideline v1.0 (Nov 17, 2026)**. It is a Muse TypeScript space: a React client in `client/`, server actions in `server/src/actions.ts`, the data model in `server/src/schema.ts`, and Drizzle SQL migrations in `drizzle/`.

The live test version runs in Muse. This repo is the source to take it further — for example, porting it to a standalone Next.js / Vite app for Vercel or Cloudflare hosting.

## Running it in Muse (the live test version)

Open the **Seattle MasterFix App** in Muse. It starts empty on purpose — no jobs are pre-loaded. Test flow: submit a test estimate request → open **More → Office tools** → move it through the pipeline → convert it to a tracked job.

## Photos

`client/src/assets/` is intentionally empty in this snapshot — the project photos are binary files and were not included in the text-only push. Add your own photos with these exact filenames to restore the gallery: `hero.jpg`, `siding.jpg`, `fencing.jpg`, `tile.jpg`, `flooring.jpg`, `drywall.jpg`, `paint.jpg`, `remodel.jpg`.

## Rules

- Never invent a price, date, or job detail. Prices appear only after Bill approves an estimate.
- Every client sees only their own jobs.
- Nothing is published, sent, or charged without the approval step in each flow.
- Do not publish to the App Store / Google Play or send anything to clients without Bill's approval for that specific item.
