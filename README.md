# IELTS Tracker

Browser-local app for planning Cambridge IELTS practice, logging band scores, and tracking progress toward target bands. Deployable on Vercel (or any static/Next host) with no backend database and no login.

## Features

- Cambridge IELTS catalogue (Academic & General Training) plus custom practice sets
- Planner with set statuses: Unstarted → To Practice → In Progress → Completed
- Score entry with raw-mark → band conversion for Listening/Reading
- Dashboard and analytics (band trends, goals)
- Per-browser IndexedDB persistence — data stays on the user's device
- JSON export/import to move data between devices or browsers

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| Data | IndexedDB in the browser (no server database) |
| Validation | Zod, React Hook Form |

## Prerequisites

- Node.js 20+
- npm (or compatible package manager)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first visit the app seeds the Cambridge catalogue and default study goals into IndexedDB in that browser.

## Deploy on Vercel

1. Push the repo to GitHub (or connect the project in the Vercel dashboard).
2. Import the project in Vercel — no environment variables are required.
3. Deploy. Each visitor's practice data is stored only in their own browser.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run unit tests (`tests/**/*.test.ts`) |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/           # Routes: dashboard, planner, analytics, settings
  components/    # UI, feature clients, LocalStoreProvider
  lib/           # Domain types, IELTS scoring, stats, local-store
docs/            # Glossary and ADRs
tests/           # Unit tests
```

## Notes for developers

- **Local-first:** All user data lives in the browser (IndexedDB). There is no shared server database and no authentication. Phone and laptop keep separate data unless the user exports/imports JSON (see [ADR 0001](docs/adr/0001-self-hosted-sqlite.md)).
- **Scoring rules:** Overall band rounding and raw→band tables live in `src/lib/ielts.ts` ([ADR 0002](docs/adr/0002-score-normalization.md)).
- **Domain language:** See [docs/glossary.md](docs/glossary.md).
- **Next.js:** This repo may use APIs that differ from older Next.js docs — check `node_modules/next/dist/docs/` when unsure.

## License

MIT — see [LICENSE](LICENSE).
