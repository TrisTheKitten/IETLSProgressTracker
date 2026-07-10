# ADR 0001: Self-Hosted Local SQLite Database

## Context & Problem Statement
The IELTS Tracker application requires a data persistence layer to store Cambridge practice catalogs, planned tasks, target score goals, settings, and logged practice attempts. The app needs to support fast CRUD operations, simple deployment, and local-first self-hosted scenarios without relying on cloud resources (such as Vercel databases, Postgres, or external hosted services).

## Decision
We choose **SQLite** as the database engine, managed via **Drizzle ORM** and the `better-sqlite3` driver. The database is stored in a local file (defaulting to `./data/ielts_tracker.db`), with its path configurable via environment variables (`DATABASE_URL`).

## Rationale
- **Zero Configuration**: SQLite does not require running a separate database server process, simplifying self-hosting. It is a single file written directly to the host's filesystem.
- **Drizzle Integration**: Drizzle ORM provides a type-safe interface for SQLite tables, compile-time query generation, and easy migrations in development and production.
- **Embedded Database Performance**: Using `better-sqlite3` provides synchronous, high-throughput queries directly inside Next.js server actions.
- **Local Backup Ease**: Database backup and restore can be done by simply exporting and importing JSON structures.

## Consequences
- **Concurrency Limitation**: SQLite supports multiple readers but locks during writes. For a single-user MVP, this is not an issue.
- **Serverless Environments**: A local SQLite file is not suitable for serverless platforms like Vercel which have read-only, ephemeral filesystems. This app must be run on a persistent server (e.g., Docker, VPS, or run locally via Node).
