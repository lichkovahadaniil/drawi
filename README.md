# drawi

drawi is a visual learning MVP for 1:1 lessons: a tutor and a student meet on a shared Excalidraw canvas with LiveKit audio/video, end the session, and keep the resulting board, checkpoint, and private student notes.

## Current MVP Scope

The first vertical slice intentionally excludes marketplace, billing, scheduling, social metrics, public comments, AI, recordings, and public creator pages.

## Local Layout

Main integrated checkout:

```text
/Users/daniillickovaha/Documents/drawi
```

Older auxiliary worktrees, when still needed, are kept under:

```text
/Users/daniillickovaha/Documents/drawi_trees/
├── drawi-excalidraw-board-sync
└── drawi-product-suite-integration
```

Use `drawi` on branch `main` for the integrated app.

## Local Development

1. `cd /Users/daniillickovaha/Documents/drawi`.
2. Copy `.env.example` to `.env`.
3. Copy `apps/sync-worker/.dev.vars.example` to `apps/sync-worker/.dev.vars`.
4. Start PostgreSQL: `pnpm dev:db`.
5. Start LiveKit locally: `pnpm dev:livekit`.
6. Start the sync worker: `pnpm dev:sync`.
7. Start the web app: `pnpm dev:web`.

Useful commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm smoke:runtime`
- `pnpm smoke:local`
- `pnpm build`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

Free no-card hosting notes are in `docs/free-hosting.md`.

`pnpm smoke:local` is the repeatable full local smoke. It creates a disposable
Postgres database, applies migrations, starts LiveKit, the sync Worker, and the
web app, runs the tutor/student browser smoke, then cleans up local runtime
state.

## Important Constraints

- LiveKit handles only audio/video/media presence, not canvas synchronization.
- Drawi-owned Excalidraw scene sync is served by the Cloudflare Worker/Durable Object boundary.
- Student private notes are stored outside the shared Excalidraw scene.
- Do not copy or modify proprietary board source to bypass licensing.
