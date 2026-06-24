# drawi sync worker

This worker is adapted from the MIT-licensed tldraw Cloudflare sync template in `tldraw-main/templates/sync-cloudflare`.

It serves:

- `/api/connect/:roomId` for tldraw WebSocket sync via Durable Objects.
- `/api/uploads/:uploadId` for local Wrangler R2-backed board assets.

The worker requires a short-lived `drawi_sync_access` HttpOnly cookie issued by the Next.js app before the WebSocket connection starts.

Run locally:

```bash
cp .dev.vars.example .dev.vars
pnpm dev:sync
```
