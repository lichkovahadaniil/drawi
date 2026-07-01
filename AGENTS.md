# Drawi Agent Rules

These rules apply to every Codex session in this repository.

## Start Here

- Read `docs/tasks.md` before changing code.
- Treat `docs/tasks.md` as the single current source of truth for backlog, baseline, verification, blockers, and handoff.
- Keep `docs/mvp-plan.md` as historical context only. Do not maintain a duplicate backlog there.
- Update `docs/tasks.md` at the start and end of every session with the current state, verification results, and exact next task.

## Safety

- Preserve working behavior for registration, sign-in, sign-out, profile creation, lesson creation, board creation, invites, join links, tutor/student permissions, LiveKit, collaborative board editing, read-only mode, private notes, ending sessions, Created/Learned libraries, checkpoint metadata, board access, board file uploads, sync authorization, and mobile layout.
- Do not run destructive Git, database, storage, or filesystem operations.
- Never use `git reset --hard`, rewrite history, force push, drop/reset the user database, delete board documents/assets, or run destructive migrations.
- Assume uncommitted changes may be user work. Read and work with them; do not revert them unless the user explicitly asks.

## Implementation

- Work in small vertical changes that preserve existing routes and behavior.
- Keep existing public routes compatible: `/`, `/sign-in`, `/sign-up`, `/join/[inviteCode]`, `/app`, `/app/boards`, `/app/boards/new`, `/app/boards/[boardId]`, `/app/sessions/[sessionId]`, and `/app/profile`.
- Before changing behavior, add or update a regression test that proves either the old behavior is preserved or the new behavior is intentional.
- Do not mark a task done until its acceptance criteria are met and relevant checks pass.
- Do not add fake UI, inert buttons, placeholder routes, or production mocks for real integrations.
- Do not disable TypeScript, ESLint, coverage, or checks to make progress.
- Do not add `any`, `@ts-ignore`, `@ts-nocheck`, coverage ignores, or broad test exclusions instead of fixing the issue.
- Preserve the existing architecture unless there is a concrete, documented reason to change it.

## Licensing

- Do not copy or modify tldraw source to bypass its production license.
- The target replacement board stack is `@excalidraw/excalidraw` plus Drawi-owned self-hosted sync.
- If MIT source from Excalidraw or Excalidraw Room is copied in a substantial way, preserve copyright notices and update `THIRD_PARTY_NOTICES.md`.
- Do not remove tldraw dependencies until a working replacement exists and migration checks plus tests pass.

## Verification

- After each task, run the smallest relevant checks and record them in `docs/tasks.md`.
- For broad or shared changes, run the full baseline suite when feasible:
  - `pnpm install --frozen-lockfile`
  - `pnpm format:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm --filter @drawi/web test:coverage`
  - `pnpm build`
- If a check fails, record the exact command, key error text, whether it is pre-existing, and whether it was fixed.
- For UI changes, capture desktop and mobile screenshots before and after the change.

## Handoff

- End each session by updating `docs/tasks.md` with completed work, verification results, known risks, blockers, and the exact next task.
- Do not leave future agents guessing which task is current.
