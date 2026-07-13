# ADR 0001: Browser-Local IndexedDB Persistence

## Context & Problem Statement
The IELTS Tracker application needs to store Cambridge practice catalogs, planned tasks, target score goals, settings, and logged practice attempts. The product goals are: free for everyone, no authentication, and data that stays on each user's device so the app can deploy on serverless hosts such as Vercel.

## Decision
We persist a single application document in **IndexedDB** in the user's browser. The document shape matches the existing JSON backup payload (`books`, `sets`, `attempts`, `goals`, `settings`). Mutations and queries run client-side; the Next.js app ships UI and seed logic only.

## Rationale
- **No server database:** Vercel (and similar hosts) do not need a writable filesystem or hosted SQL service.
- **No auth:** Each browser is its own private store; there is no shared multi-tenant backend to protect.
- **Portable backups:** Export/import JSON remains the way to move data between devices or recover after clearing site data.
- **Familiar domain model:** The same backup schema used previously for SQLite export continues to validate stored state.

## Consequences
- **Per-device isolation:** Phone and laptop do not sync automatically; users must export/import to copy data.
- **Ephemeral contexts:** Private/incognito windows lose data when the session ends.
- **Clearing site data:** Wiping browser storage for the site deletes the tracker unless a backup was exported.
- **Supersedes:** The earlier self-hosted SQLite + `better-sqlite3` approach, which could not run reliably on serverless platforms.
