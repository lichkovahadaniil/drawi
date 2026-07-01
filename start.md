# Start Drawi

Integrated branch: `codex/drawi-product-suite`

```bash
cd /Users/daniillickovaha/Documents/drawi_trees/drawi-product-suite-integration
cp .env.example .env
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
