# drawi

drawi is a visual learning MVP for 1:1 lessons: a tutor and a student meet on a shared tldraw canvas with LiveKit audio/video, end the session, and keep the resulting board, checkpoint, and private student notes.

## Current MVP Scope

The first vertical slice intentionally excludes marketplace, billing, scheduling, social metrics, public comments, AI, recordings, and public creator pages.

## Local Reference Sources

The folders `tldraw-main/` and `livekit-master/` are local upstream references only. They are excluded from git and must not be edited as drawi application source. When small pieces are copied into drawi, preserve applicable license notices and document the source.

## Local Development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `pnpm dev:db`.
3. Start LiveKit locally: `pnpm dev:livekit`.
4. Start the sync worker: `pnpm dev:sync`.
5. Start the web app: `pnpm dev:web`.

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
- tldraw sync is served by the Cloudflare Worker/Durable Object boundary.
- Student private notes are stored outside the shared tldraw document.
- tldraw production deployment requires a valid SDK license key.
