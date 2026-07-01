# drawi sync worker

This worker hosts Drawi's own Excalidraw scene sync protocol on Cloudflare Workers,
Durable Objects, and R2.

It serves:

- `/api/connect/:roomId` for authorized Excalidraw scene WebSocket sync via Durable Objects.
- `/api/uploads/:roomId/:uploadId` for local Wrangler R2-backed board assets.

The worker requires a short-lived `drawi_sync_access` HttpOnly cookie issued by the Next.js app before the WebSocket connection starts.

Run locally:

```bash
cp .dev.vars.example .dev.vars
pnpm dev:sync
```
