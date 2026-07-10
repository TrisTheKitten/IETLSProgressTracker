# IELTS Tracker

Self-hosted app for planning Cambridge IELTS practice, logging band scores, and tracking progress toward target bands.

## Features

- Cambridge IELTS catalogue (Academic & General Training) plus custom practice sets
- Planner with set statuses: Unstarted → To Practice → In Progress → Completed
- Score entry with raw-mark → band conversion for Listening/Reading
- Dashboard and analytics (band trends, goals)
- Local SQLite persistence — no cloud database required

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| Data | SQLite via Drizzle ORM + `better-sqlite3` |
| Validation | Zod, React Hook Form |

## Prerequisites

- Node.js 20+
- npm (or compatible package manager)
- Native build tools for `better-sqlite3` (usually present on macOS/Linux; on Windows, follow the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) install notes)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first run the app creates `./data/ielts_tracker.db`, applies Drizzle migrations, and seeds the Cambridge catalogue plus default study goals.

### Environment

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `./data/ielts_tracker.db` | Path to the SQLite database file |

Optional `.env.local`:

```bash
DATABASE_URL=./data/ielts_tracker.db
```

The `data/` directory is gitignored (runtime state only).

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
  app/           # Routes: dashboard, planner, analytics, settings + server actions
  components/    # UI and feature clients
  db/            # Schema, queries, migrations runner, Cambridge seed
  lib/           # Domain types, IELTS scoring, stats helpers
drizzle/         # SQL migrations
docs/            # Glossary and ADRs
tests/           # Unit tests
data/            # Local SQLite file (created at runtime)
```

## Notes for developers

- **Local-first:** Designed for a single user on a machine or VPS with a writable filesystem. Not suitable for serverless hosts with ephemeral storage (see [ADR 0001](docs/adr/0001-self-hosted-sqlite.md)).
- **Scoring rules:** Overall band rounding and raw→band tables live in `src/lib/ielts.ts` ([ADR 0002](docs/adr/0002-score-normalization.md)).
- **Domain language:** See [docs/glossary.md](docs/glossary.md).
- **Next.js:** This repo may use APIs that differ from older Next.js docs — check `node_modules/next/dist/docs/` when unsure.

## License

MIT — see [LICENSE](LICENSE).
