# drawi

drawi is a visual learning MVP for 1:1 lessons: a tutor and a student meet on a shared Excalidraw canvas with LiveKit audio/video, end the session, and keep the resulting board, checkpoint, and private student notes.

## Current MVP Scope

The first vertical slice intentionally excludes marketplace, billing, scheduling, social metrics, public comments, AI, recordings, and public creator pages.

## Worktree Layout

Local worktrees are kept under:

```text
/Users/daniillickovaha/Documents/drawi_trees/
├── drawi
├── drawi-excalidraw-board-sync
└── drawi-product-suite-integration
```

Use `drawi-product-suite-integration` on branch `codex/drawi-product-suite` for the integrated app.

## Local Development

1. `cd /Users/daniillickovaha/Documents/drawi_trees/drawi-product-suite-integration`.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL: `pnpm dev:db`.
4. Start LiveKit locally: `pnpm dev:livekit`.
5. Start the sync worker: `pnpm dev:sync`.
6. Start the web app: `pnpm dev:web`.

Useful commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Important Constraints

- LiveKit handles only audio/video/media presence, not canvas synchronization.
- Drawi-owned Excalidraw scene sync is served by the Cloudflare Worker/Durable Object boundary.
- Student private notes are stored outside the shared Excalidraw scene.
- Do not copy or modify proprietary board source to bypass licensing.
