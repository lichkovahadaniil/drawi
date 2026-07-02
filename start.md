# Start Drawi

Integrated branch: `main`

```bash
cd /Users/daniillickovaha/Documents/drawi
cp .env.example .env
cp apps/sync-worker/.dev.vars.example apps/sync-worker/.dev.vars
pnpm install --frozen-lockfile
pnpm dev:db
pnpm db:migrate
```

Start services in separate terminals:

```bash
pnpm dev:livekit
pnpm dev:sync
pnpm dev:web
```

Open `http://localhost:3000`.

Optional seed, after web is running:

```bash
pnpm db:seed
```

Seed users: `tutor@example.com` / `student@example.com`, password `drawi-password`.

Runtime smoke, after all services are already running:

```bash
pnpm smoke:runtime
```

Full local runtime smoke with disposable Postgres database and managed local
services:

```bash
pnpm smoke:local
```

Free hosting path: `docs/free-hosting.md`.
