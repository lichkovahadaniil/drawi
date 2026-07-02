# Free Hosting Runbook

This runbook keeps Drawi on free/no-card tiers for a tiny beta of roughly five people.

## Current Fit

The app is ready for a small free beta after external accounts are connected.

- Vercel Hobby can host the Next.js web app for a personal/non-commercial beta.
- Neon Free can host the Postgres database, with possible cold starts after idle.
- Cloudflare Workers Free + Durable Objects + R2 can host board sync and board assets.
- LiveKit Cloud Build is enough for light five-person testing, but not all-day calls.

Five simultaneous users is realistic if they are a tiny beta, upload small board images, and do not keep video calls running for hours. If usage becomes daily classroom traffic, expect LiveKit minutes and database limits to be the first pressure points.

## Current Blockers

Codex cannot finish the external deployment without user-owned account access.

- Cloudflare CLI: `pnpm --filter @drawi/sync-worker exec wrangler whoami` reports no authenticated user.
- Vercel CLI: `pnpm dlx vercel whoami` reports no credentials and the login flow currently fails with `fetch failed`.
- Neon project and pooled Postgres connection string do not exist in this workspace.
- LiveKit Cloud project URL/API key/API secret do not exist in this workspace.
- Production env vars and Cloudflare secrets must be set inside the provider dashboards/CLIs.

## 1. Create Free Resources

1. Create a Neon Free project and copy the pooled Postgres connection string.
2. Create a Cloudflare account, then authenticate Wrangler:

   ```bash
   pnpm --filter @drawi/sync-worker exec wrangler login
   pnpm --filter @drawi/sync-worker exec wrangler whoami
   ```

3. Create the R2 bucket names from `apps/sync-worker/wrangler.jsonc`:

   ```bash
   pnpm --filter @drawi/sync-worker exec wrangler r2 bucket create drawi-board-assets
   pnpm --filter @drawi/sync-worker exec wrangler r2 bucket create drawi-board-assets-preview
   ```

4. Create a LiveKit Cloud project and copy:

   - `wss://...livekit.cloud`
   - API key
   - API secret

5. Create or import a Vercel Hobby project for this repository.

   In Vercel, make sure the web project targets `apps/web` or otherwise builds only `@drawi/web`. Do not use the root `pnpm build` as the Vercel build command, because root build also dry-runs the Cloudflare Worker.

## 2. Set Secrets

Generate two long random secrets:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use one value for `BETTER_AUTH_SECRET`. Use the other same value for both:

- Vercel env `SYNC_COOKIE_SECRET`
- Cloudflare Worker secret `SYNC_COOKIE_SECRET`

Set the Worker secret:

```bash
printf '%s' '<sync-cookie-secret>' | pnpm --filter @drawi/sync-worker exec wrangler secret put SYNC_COOKIE_SECRET
```

Set these Vercel production environment variables from `.env.production.example`:

- `APP_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_DRAWI_SYNC_URL`
- `SYNC_COOKIE_SECRET`
- `SYNC_WORKER_ORIGIN`

## 3. Deploy

Deploy the sync worker first:

```bash
pnpm deploy:sync
```

Copy the deployed Worker URL into Vercel:

- `NEXT_PUBLIC_DRAWI_SYNC_URL`
- `SYNC_WORKER_ORIGIN`

Apply migrations to Neon:

```bash
DATABASE_URL='<neon-pooled-connection-string>' pnpm db:migrate
```

Deploy the web app from Vercel. If using the CLI after login:

```bash
pnpm dlx vercel login
pnpm dlx vercel --prod
```

## 4. Verify

Run the production smoke against the deployed app:

```bash
PLAYWRIGHT_BASE_URL='https://your-drawi-app.vercel.app' pnpm smoke:runtime
```

The smoke creates disposable tutor/student accounts, starts a lesson, joins by invite, verifies board sync, saves private notes, ends the session, creates a checkpoint, and restores it as a new board.

## Free-Tier Guardrails

- Keep this as a personal/small beta deployment, not a commercial production workload.
- Keep uploaded board images small; R2 has free allowances but still has request/storage limits.
- LiveKit free minutes are enough for light testing, not all-day calls.
- Neon Free can sleep; first request after idle may be slower.
- If any provider asks for a card during account setup, stop and choose another free account path instead of upgrading.

## Official References

- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Neon Free plan: https://neon.com/docs/introduction/plans#free-plan
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Durable Objects limits: https://developers.cloudflare.com/durable-objects/platform/limits/
- Cloudflare R2 pricing/free allowances: https://www.cloudflare.com/developer-platform/products/r2/
- LiveKit Cloud quotas and limits: https://docs.livekit.io/home/cloud/quotas-and-limits/
