# Drawi Tasks

Last updated: 2026-06-25
Current milestone: Product hardening and Excalidraw migration preparation
Current branch: main
Baseline commit: 6a54d726f566437eacdaa1ec0b11a76d61ca29d9

## Non-negotiable constraints

- Preserve all currently working public routes and flows unless a compatible redirect and regression test are added.
- Do not run destructive Git, database, R2, Durable Object, or migration operations.
- Do not delete existing board documents or assets.
- Do not use production mocks or fake UI in place of real behavior.
- Do not disable TypeScript, ESLint, coverage, or test checks.
- Do not use `any`, `@ts-ignore`, `@ts-nocheck`, or coverage ignores to avoid fixing types/tests.
- Do not copy or modify tldraw source to bypass licensing.
- Migrate to `@excalidraw/excalidraw` and Drawi-owned sync only after a tested replacement is ready.
- Keep `docs/tasks.md` as the current source of truth. `docs/mvp-plan.md` is historical.

## Current system state

- Web app boundary: `apps/web` is a Next.js App Router app with Better Auth, Drizzle/Postgres, LiveKit token issuance, board/session/profile server actions, and tldraw client rendering.
- Sync boundary: `apps/sync-worker` is a Cloudflare Worker + Durable Object + R2 boundary adapted from the tldraw Cloudflare sync template. It handles WebSocket room sync and board asset uploads/downloads.
- Authorization model: Better Auth email/password sessions protect `/app/**`. Server actions use `getRequiredUser()`. LiveKit tokens require live session membership. Sync access requires a short-lived HttpOnly cookie issued by the web app.
- Board access model: board owners implicitly manage their boards. `board_access` rows grant `manage`, `edit`, or `view`; revoked rows have `revoked_at`. Joined students receive `edit` board access.
- Board deletion model: board deletion is currently a soft delete through `boards.status = deleted`; deleted boards are hidden from dashboard/library queries and remain physically present in Postgres, sync storage, and R2.
- Join-code entry: `/join` accepts a pasted invite code or full `/join/[inviteCode]` URL, normalizes it, and redirects into the existing invite flow. `/join/[inviteCode]` remains compatible.
- Board state format: live board state is currently tldraw records persisted inside the Durable Object SQLite sync storage. Postgres stores board metadata, room id, access, sessions, library items, notes, and checkpoint metadata.
- Sync-cookie mechanism: `POST /api/board-sync/session-cookie` validates board access, signs `drawi_sync_access` with HMAC-SHA256, and sets an 8-hour HttpOnly cookie. The worker verifies signature, expiry, and room id before WebSocket, upload, or download access.
- R2 assets: board files are stored under `rooms/{roomId}/uploads/{uploadId}` with MIME allowlist, size limit, immutable caching, CSP `default-src 'none'`, and `nosniff`.
- Checkpoint flow: manual and session-end actions create immutable checkpoint metadata with a generated `snapshotStorageKey`. Actual snapshot upload to R2 is not implemented yet.
- Restore flow: `Restore as new board` creates a new board with provenance metadata, but does not hydrate the new room from checkpoint payload yet.
- Private notes: `student_notes` are plain text keyed by `(board_id, student_id)`, saved through an own-note server action that now also requires board visibility, and not included in sync worker, LiveKit, checkpoint payloads, or public/export paths.
- Existing mobile layout: public/auth/app pages use responsive grids and spacing; authenticated visual smoke still needs a signed-in local session.
- tldraw-bound production code remains in:
  - `apps/web/package.json`
  - `apps/web/app/layout.tsx`
  - `apps/web/features/board/collaborative-board.tsx`
  - `apps/web/features/board/sync-client.ts`
  - `apps/web/server/env/server.ts`
  - `.env.example`
  - `apps/sync-worker/package.json`
  - `apps/sync-worker/wrangler.jsonc`
  - `apps/sync-worker/worker/worker.ts`
  - `apps/sync-worker/worker/TldrawDurableObject.ts`
  - `apps/sync-worker/worker/assetUploads.ts`
  - `apps/sync-worker/worker-configuration.d.ts`
  - migration/schema fields named `tldraw_schema_version`
- Current test coverage:
  - Unit tests cover handle rules, invite helpers, permission helpers, sync token signing, sync client URL/cookie behavior, and the 8-hour sync TTL.
  - Invite helper tests now cover pasted invite-code/link normalization, including malformed percent encoding.
  - Permission helper tests now cover `canDeleteBoard` for active/deleted boards.
  - No integration tests with real test Postgres yet.
  - No Playwright config or E2E test suite is present yet.
  - Server actions, route rendering, LiveKit API route, sync-cookie route, worker auth, worker upload/download, Durable Object sync, private-note persistence, checkpoint payload upload, restore hydration, and mobile authenticated flows need coverage.

## Task board

| ID   | Priority | Status      | Area                 | Task                                                                                          | Dependencies                       | Acceptance criteria                                                                                                                                    | Required tests                                                                                |
| ---- | -------- | ----------- | -------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| T001 | P0       | Done        | Continuation         | Create `AGENTS.md` and `docs/tasks.md` as the persistent handoff system.                      | None                               | Future sessions have clear start rules, constraints, baseline, backlog, and next task.                                                                 | Docs-only; full baseline recorded.                                                            |
| T002 | P0       | Done        | Baseline             | Run required baseline checks and capture public route screenshots before UI/product changes.  | None                               | Commands and screenshot paths are recorded with pass/fail state and exact install issue.                                                               | Baseline command suite, Browser screenshots.                                                  |
| T003 | P0       | In progress | Regression coverage  | Add tests for access-sensitive server behavior before product changes.                        | T001, T002                         | Board access, private notes, invites, session membership, and sync-cookie authorization are covered without weakening existing tests.                  | Focused Vitest tests; coverage remains 100% for included files.                               |
| T004 | P0       | In progress | Board privacy        | Add explicit board privacy/publishing model while preserving owner/access behavior.           | T003                               | Boards can remain private by default; published boards can be viewed through intentional public paths; private boards stay inaccessible to strangers.  | Migration/schema tests, permission tests, route/service tests.                                |
| T005 | P0       | Todo        | Public profiles      | Add user profile pages and published-board listings.                                          | T004                               | Public handles resolve to user pages; published boards are visible; private boards are hidden; existing `/app/profile` remains unchanged.              | Route/service tests plus Browser smoke.                                                       |
| T006 | P0       | Todo        | Checkpoints          | Implement real checkpoint snapshot payload upload at manual and session end checkpoints.      | T003                               | Checkpoint metadata points to an existing immutable R2 object; failures do not mark sessions ended without a recorded checkpoint decision.             | Unit/service tests with storage adapter mock; worker/storage tests if adapter touches worker. |
| T007 | P0       | Todo        | Restore              | Hydrate `Restore as new board` from checkpoint payload.                                       | T006                               | Restored board opens as a new editable board with checkpoint content and provenance metadata.                                                          | Service tests plus sync/board smoke.                                                          |
| T008 | P0       | Todo        | Excalidraw migration | Replace tldraw board UI/sync with `@excalidraw/excalidraw` and Drawi-owned self-hosted sync.  | T003, T006, T007                   | No production dependency or env var remains for tldraw; existing board/session/library flows still work; migration checks pass.                        | Unit, integration, worker, Browser, and E2E coverage.                                         |
| T009 | P1       | Todo        | E2E                  | Add Playwright E2E with tutor/student browser contexts.                                       | Stable local test DB and seed flow | Critical flows pass: signup/signin, profile, create lesson, invite join, edit/read-only, notes, end session, libraries.                                | Playwright suite in CI-compatible config.                                                     |
| T010 | P1       | Todo        | Mobile QA            | Add authenticated mobile smoke coverage.                                                      | T009                               | Main app, boards, board page, and session page do not overflow or obscure primary controls on mobile.                                                  | Playwright mobile viewport tests and screenshots.                                             |
| T011 | P0       | Done        | Join flow            | Add a user-visible conference/lesson-code input.                                              | T003                               | Students can open `/join`, paste a raw code or full invite link, and land in the existing `/join/[inviteCode]` flow.                                   | Invite normalization unit tests; Browser desktop/mobile join smoke.                           |
| T012 | P0       | Done        | Board lifecycle      | Add user-visible board deletion without physically deleting board data/assets.                | T003                               | Board owners/managers can soft-delete boards; deleted boards disappear from dashboard/library lists and remain inaccessible via existing guards.       | Permission helper unit tests; full build/check suite.                                         |
| T013 | P0       | Done        | Board privacy        | Add the board privacy data model and owner controls for the three requested visibility modes. | T003                               | Boards store `public`, `private_link`, or `session_link`; owners can set it at creation and update it later; sync access remains explicit-access only. | Migration/schema generation, permission tests, coverage, build.                               |

## Parallel workstream handoff

Integrator status:

- Branch: `codex/drawi-product-suite`, created from `main` on 2026-06-30 with the existing working tree preserved.
- 2026-07-01 integration review resumed on clean worktree `/Users/daniillickovaha/Documents/drawi-product-suite-integration`; feature branch refs still point at baseline `6a54d726f566437eacdaa1ec0b11a76d61ca29d9`, so Agent B/C/D work exists as dirty worktree changes in `/Users/daniillickovaha/Documents/drawi` and Agent A work exists as dirty worktree changes in `/Users/daniillickovaha/Documents/drawi-excalidraw-board-sync`.
- Current integration rule: apply only reviewed Agent A-D files into `codex/drawi-product-suite`; keep unrelated untracked `MinerU-master/`, generated `next-env.d.ts` churn, placeholder `pnpm-workspace.yaml` allowBuilds, and historical `docs/mvp-plan.md` backlog edits out unless explicitly needed.
- 2026-07-01 integration result: reviewed and integrated Agent A-D work into `codex/drawi-product-suite` by applying reviewed worktree diffs because the feature branch refs had no separate commits. Added repository-local `.agents/skills/full-project-review` and used it for the review checklist.
- Integrated scope: Excalidraw board client, Drawi-owned sync worker Durable Object, authorized upload/download routes, LiveKit bottom media rail and real mic/camera/share controls, private note overlays, channel-style profiles, profile search, friend requests, board/channel privacy, app shell polish, and Settings day/night theme.
- Review fixes applied before verification: added `/app/search` to app-shell navigation; prevented the mobile CSS rule from hiding text on every `.drawi-button`; changed stale public copy from `Shared tldraw canvas` to `Shared Excalidraw canvas`; made sticky-note overlay text readable in night mode; made `createBoardSyncConnectUrl` emit `ws://`/`wss://` while keeping uploads on HTTP(S); fixed ThemeToggle's React hook lint issue; removed the nested Settings card wrapper; restored generated `apps/web/next-env.d.ts` drift after build.
- Deliberately excluded from integration: unrelated untracked `MinerU-master/`, generated `apps/web/next-env.d.ts` production-route import churn, placeholder `pnpm-workspace.yaml allowBuilds`, and `docs/mvp-plan.md` active-backlog edits.
- Verification passed on `codex/drawi-product-suite`: `CI=true pnpm install --frozen-lockfile` (with pnpm ignored-build-script warning for `esbuild`, `sharp`, `unrs-resolver`, `workerd`); focused `pnpm --filter @drawi/web test -- apps/web/tests/board-sync-client.test.ts` (the package runner executed all 4 web test files, 36 tests); focused domain and LiveKit media test commands (also all 4 files / 36 tests); `pnpm --filter @drawi/sync-worker typecheck`; `pnpm format:check`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm --filter @drawi/web test:coverage` at 100% statements/branches/functions/lines; `pnpm --filter @drawi/sync-worker build`; and `pnpm build` with dev-safe env vars inline.
- Browser/Playwright smoke passed after installing the missing Playwright Chromium cache: dev server at `http://127.0.0.1:3010`; desktop and mobile `/`, `/join`, `/sign-in` were nonblank, had no horizontal overflow, and emitted no console warnings/errors. Screenshots saved under `/tmp/drawi-integration-qa-2026-07-01`.
- Remaining risks: no migrated disposable Postgres was run for migration `0001_boring_bloodscream.sql`; no authenticated tutor/student Browser screenshots were captured for `/app/profile`, `/app/search`, `/u/[handle]`, board pages, or live session because no seeded authenticated local session was available; existing live tldraw room payloads are not automatically converted to Excalidraw scene JSON; checkpoint snapshot payload upload and restore hydration remain separate unfinished tasks.
- Exact next integrator task: run a disposable migrated database/authenticated smoke for profile search, public channel visibility, board/session rendering, Excalidraw sync-cookie connection, readonly mode, and LiveKit controls.

### Agent A Board Sync

- Branch: `codex/excalidraw-board-sync`.
- Status: in progress on 2026-06-30; branch created from `codex/drawi-product-suite` in isolated worktree `/Users/daniillickovaha/Documents/drawi-excalidraw-board-sync` to avoid mixing with other agents' uncommitted work.
- Current scope: replace the tldraw board UI/sync boundary with `@excalidraw/excalidraw` and a Drawi-owned WebSocket Durable Object protocol while preserving sync-cookie authorization, read-only mode, and authorized asset routes.
- Verification plan: focused board sync client tests first, then sync worker typecheck/build, root `pnpm typecheck`, root `pnpm test`, and root `pnpm build`.
- Exact next Agent A task: implement the Excalidraw client adapter and Drawi sync worker protocol, then remove tldraw production dependencies once the replacement compiles and tests pass.
- Merge guardrails: preserve the working Excalidraw replacement, Drawi-owned self-hosted sync, sync-cookie authorization, read-only behavior, authorized uploads/downloads, and removal of tldraw production dependency only after the replacement is working and verified.

### Agent B Lesson Media Notes

- Branch: `codex/lesson-media-notes`.
- Status: implementation complete on 2026-06-30; branch created from `codex/drawi-product-suite` with existing integration worktree changes preserved. Full-suite verification is blocked by other active workstream changes listed below.
- Completed work: session page now keeps the board as the primary surface, moves participants and call controls into a sticky bottom rail, preserves `RoomAudioRenderer`, replaces the LiveKit prefab conference with custom mic/camera/screen-share controls backed by `localParticipant.setMicrophoneEnabled`, `setCameraEnabled`, and `setScreenShareEnabled`, and adds an explicit LiveKit token grant for microphone, camera, screen share, and screen-share audio sources.
- Completed private notes work: session notes now render as private sticky overlays on top of the board area while still saving only the current user's plain-text `student_notes` through `saveStudentNoteAction`; no board sync, checkpoint, public route, or export path was changed.
- Verification passed: `./node_modules/.bin/vitest run tests/livekit-media.test.ts` (3 tests), targeted `./node_modules/.bin/prettier --check` for Agent B files, and targeted `./node_modules/.bin/eslint` for Agent B files.
- Verification blocked or failed: root `pnpm --filter @drawi/web test` could not be used because the pnpm wrapper first failed with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, then `ERR_PNPM_IGNORED_BUILDS`; direct full `./node_modules/.bin/vitest run` failed in pre-existing/current-worktree `tests/board-sync-client.test.ts` because sync URLs now include `?sessionId=...`; direct `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` failed in other workstreams (`/app/profile` and `/u/[handle]` typed links, `/app/settings` typed link, and missing `@excalidraw/excalidraw` imports in board files). Agent B files no longer appear in the typecheck error list.
- Browser QA: dev server started at `http://127.0.0.1:3000`; `/app/sessions/test-session` redirected to `/sign-in` without console errors because no authenticated local session was available. Authenticated desktop/mobile session screenshots remain pending.
- Exact next Agent B task: after the Excalidraw/profile/theme worktree blockers are resolved and a tutor/student local session is available, rerun full web tests/typecheck/coverage and capture authenticated desktop/mobile session screenshots proving the board-first layout, bottom media rail, real mute/unmute state, and private-only note overlays.
- Merge guardrails: preserve the main board area, bottom participant video strip, custom minimal call controls, connected audio renderer, real LiveKit mute/unmute state, and private student notes that do not enter board sync, checkpoint payloads, public routes, or exports.

### Agent C Profiles Social Privacy

- Branch: `codex/profiles-social-privacy`.
- Status: feature implemented on 2026-06-30; branch created from `codex/drawi-product-suite` with existing dirty working-tree changes preserved, and HEAD was restored to this branch after parallel worktree branch switches appeared in `git reflog`.
- Current scope: channel-style public profiles with Teaching/Learning tabs, search choosing tutor/channel vs student/learning view, private channel behavior, friends/friend requests, and channel/board privacy visibility rules for only me, friends, and everyone.
- Completed this session: added `private/friends/public` board privacy semantics, channel privacy fields, teaching-channel flag, friendship request data model/actions, `/u/[handle]` channel pages with Teaching/Learning tabs, `/app/search` handle/nickname search with teaching-vs-learning routing, profile-page channel/friend controls, and profile/channel query filtering that never selects `student_notes`.
- Verification results: local `apps/web` domain test passed (`./node_modules/.bin/vitest run tests/domain.test.ts`, 22 tests); local full web tests passed (`./node_modules/.bin/vitest run`, 4 files / 33 tests); local coverage passed at 100% statements/branches/functions/lines (`./node_modules/.bin/vitest run --coverage`); local web typecheck passed (`../../node_modules/.bin/tsc --noEmit` from `apps/web`) after `./node_modules/.bin/next typegen`; local web build passed (`./node_modules/.bin/next build`); local sync-worker typecheck and Wrangler dry-run build passed; local ESLint and Prettier checks passed on Agent C edited TS/TSX/JSON files.
- Required pnpm checks: `pnpm typecheck`, `pnpm test`, and `pnpm build` all failed before running project scripts with `ERR_PNPM_IGNORED_BUILDS` for ignored build scripts (`esbuild`, `sharp`, `unrs-resolver`, `workerd`). This matches an environment/pnpm wrapper issue, not a TypeScript/test/build failure in the local binary checks above.
- Known risks: no migrated database or authenticated Browser screenshots were run for the new channel UI; public board cards intentionally list visible boards without granting `/app/boards/[boardId]` or sync-cookie access to strangers/friends; shared worktree still contains unrelated Agent B/D dirty files and untracked routes/components outside Agent C scope.
- Exact next Agent C task: run the same checks through the normal pnpm wrapper after dependency build-script approval is resolved, then apply the migration to a disposable database and capture authenticated desktop/mobile screenshots for `/app/profile`, `/app/search`, and `/u/[handle]`.
- Merge guardrails: preserve channel-style profile pages, Teaching/Learning tabs, nickname search behavior, private channel behavior, friend/friend-request rules, and board/channel privacy modes for only me, friends, and everyone.

### Agent D Theme Shell

- Branch: `codex/theme-shell-settings`.
- Status: in progress on 2026-06-30; branch created from `codex/drawi-product-suite` with pre-existing uncommitted integration worktree changes preserved.
- Current scope: add a real Settings day/night theme toggle backed by local browser persistence, apply the theme without app-shell layout shift, and polish the shared authenticated shell/dashboard density in a YouTube + Miro direction without fake search, friends, or board logic.
- Verification plan: inspect current app/settings shell surfaces, make focused client/CSS changes only in Agent D-owned paths, then run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and desktop/mobile Browser screenshots.
- Exact next Agent D task: inspect the authenticated app layout, dashboard page, global CSS, component inventory, and existing settings route before editing theme shell code.
- Merge guardrails: preserve the day/night settings flow, app shell polish, responsive mobile layout, readable controls in both themes, and no fake search/friends/board logic.

## Completed in current session

- Resumed T004 in the next continuation: explicit board privacy model for `for everyone`, `only me + link`, and `meeting participants + link`, while keeping sync-cookie/edit access separate from public/link visibility.
- Resumed work from the persistent goal: YouTube-like profiles with board privacy and deletion, conference-code join field, own board stack without external paid dependency, and a friendlier student-first UI using white, `#fdd9b5`, and `#77736e`.
- Loaded the required Browser, Build Web Apps, and Cloudflare web-performance skills for this continuation. The configured Cloudflare skill path had moved from the objective's pasted path to `/Users/daniillickovaha/.codex/plugins/cache/openai-curated/cloudflare/02a164be/skills/web-perf/SKILL.md`.
- Read the pasted product-hardening brief from `/Users/daniillickovaha/.codex/attachments/34fdea12-c593-4887-b34f-ef362a9dac2f/pasted-text-1.txt`.
- Read required repository docs, package/config files, schema, services, domain helpers, board/session/join/profile routes, sync worker files, tests, Vitest config, env example, and migrations.
- Mapped current web/sync boundaries, authorization, board access, board-state storage, sync-cookie, R2 assets, checkpoint/restore gaps, tldraw dependencies, and test gaps.
- Ran the baseline command suite.
- Captured Browser baseline screenshots for public/protected-redirect routes in desktop and mobile viewports.
- Created `AGENTS.md`.
- Created this `docs/tasks.md`.
- Started T003 by adding a private-notes authorization regression: own private notes now require visibility on the target board before read/write.
- Added `/join` with a real lesson-code input. The form accepts raw codes or full invite links and redirects into the existing `/join/[inviteCode]` flow.
- Added join-code entry points on the landing page and authenticated app shell/dashboard.
- Added `normalizeInviteCodeInput` tests for raw codes, full invite links, query strings, empty input, and malformed percent encoding.
- Added `canDeleteBoard` permission coverage and a `deleteBoardAction` that soft-deletes boards through `boards.status = deleted`, records a `board.deleted` audit event, revalidates app/boards routes, and redirects to `/app/boards`.
- Updated dashboard/library queries to hide deleted boards.
- Added owner delete buttons on `/app/boards` cards and manager delete action on `/app/boards/[boardId]`.
- Browser QA found mobile landing nav button text wrapping after the new `Join with code` link; fixed the nav to wrap buttons by row while preserving button text.
- Added `board_visibility` enum and `boards.visibility` with default `session_link` in generated migration `apps/web/server/db/migrations/0001_boring_bloodscream.sql`.
- Added pure privacy helpers and tests for the three requested modes: `public`, `private_link`, and `session_link`.
- Kept sync-cookie authorization separate from visibility: public/link visibility does not grant sync access without owner/access rows.
- Added privacy selection to `/app/boards/new` and a real `Save privacy` manager form on `/app/boards/[boardId]`.
- Added privacy labels on dashboard and boards cards.
- Updated dashboard/library queries so `private_link` boards remain visible to their owners but are hidden from other users' libraries unless opened by direct route/link in a future public/link viewer.

## Verification results

| Command or check                                                         | Result                     | Notes                                                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                         | Failed first run           | Existing environment/pnpm non-TTY issue, not app code: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY Aborted removal of modules directory due to no TTY`.                     |
| `CI=true pnpm install --frozen-lockfile`                                 | Passed                     | Completed after registry retries. pnpm warned that build scripts were ignored for `esbuild`, `sharp`, `unrs-resolver`, and `workerd`.                                       |
| `pnpm format:check`                                                      | Passed                     | `All matched files use Prettier code style!`                                                                                                                                |
| `pnpm lint`                                                              | Passed                     | `eslint .` completed successfully.                                                                                                                                          |
| `pnpm typecheck`                                                         | Passed                     | Web and sync worker `tsc --noEmit` completed successfully.                                                                                                                  |
| `pnpm test`                                                              | Passed                     | 3 test files, 19 tests passed.                                                                                                                                              |
| `pnpm --filter @drawi/web test:coverage`                                 | Passed                     | 100% statements, branches, functions, and lines for currently included files.                                                                                               |
| `pnpm build`                                                             | Passed                     | Next production build and sync worker Wrangler dry-run build completed successfully.                                                                                        |
| Playwright E2E                                                           | Not run                    | Playwright package is installed, but no Playwright config or E2E tests exist in the repo.                                                                                   |
| Browser desktop screenshots                                              | Passed for public baseline | Saved under `/tmp/drawi-baseline-2026-06-25`: `desktop-landing.png`, `desktop-sign-in.png`, `desktop-sign-up.png`, `desktop-join.png`, `desktop-app-protected.png`.         |
| Browser mobile screenshots                                               | Passed for public baseline | Saved under `/tmp/drawi-baseline-2026-06-25`: `mobile-landing.png`, `mobile-sign-in.png`, `mobile-sign-up.png`, `mobile-join.png`, `mobile-app-protected.png`.              |
| Browser interaction proof                                                | Passed                     | Landing `Sign in` link resolved uniquely and navigated to `/sign-in`.                                                                                                       |
| Browser console health                                                   | Passed for checked pages   | No console `error` or `warn` entries were reported.                                                                                                                         |
| Browser framework overlay check                                          | Passed visually            | No error overlay was visible. The `nextjs-portal` element exists for the dev indicator only.                                                                                |
| Post-change `pnpm --filter @drawi/web test`                              | Passed                     | 3 test files, 20 tests passed.                                                                                                                                              |
| Post-change `pnpm format:check`                                          | Passed                     | `All matched files use Prettier code style!`                                                                                                                                |
| Post-change `pnpm lint`                                                  | Passed                     | `eslint .` completed successfully.                                                                                                                                          |
| Post-change `pnpm typecheck`                                             | Passed                     | Web and sync worker `tsc --noEmit` completed successfully.                                                                                                                  |
| Post-change `pnpm --filter @drawi/web test:coverage`                     | Passed                     | 100% statements, branches, functions, and lines for currently included files: 71/71 statements, 49/49 branches, 28/28 functions, 60/60 lines.                               |
| Post-change `pnpm build`                                                 | Passed                     | Next production build and sync worker Wrangler dry-run build completed successfully.                                                                                        |
| Continuation `pnpm --filter @drawi/web test`                             | Passed                     | 3 test files, 21 tests passed after invite-code and delete permission coverage.                                                                                             |
| Continuation `pnpm format:check`                                         | Passed                     | `All matched files use Prettier code style!`                                                                                                                                |
| Continuation `pnpm lint`                                                 | Passed                     | `eslint .` completed successfully.                                                                                                                                          |
| Continuation `pnpm typecheck`                                            | Passed                     | Web and sync worker `tsc --noEmit` completed successfully after regenerating local Next route types for `/join` and restoring tracked `next-env.d.ts`.                      |
| Continuation `pnpm --filter @drawi/web test:coverage` first run          | Failed then fixed          | New catch branch in `normalizeInviteCodeInput` lowered coverage to 98.5% lines / 98.71% statements; fixed with malformed percent-encoding test.                             |
| Continuation `pnpm --filter @drawi/web test:coverage` final              | Passed                     | 100% statements, branches, functions, and lines: 78/78 statements, 52/52 branches, 30/30 functions, 67/67 lines.                                                            |
| Continuation `pnpm build`                                                | Passed                     | Next production build included new static `/join` route; sync worker Wrangler dry-run build passed.                                                                         |
| Browser `/join` desktop smoke                                            | Passed                     | `http://localhost:3000/join` rendered nonblank; form submit with full pasted invite link redirected to `http://localhost:3000/join/abc_DEF-123`; console clean.             |
| Browser landing desktop smoke                                            | Passed                     | Landing page exposed `Join with code` and `Join with a code`; screenshot saved to `/tmp/drawi-join-qa-2026-06-25/desktop-landing-join-link.png`.                            |
| Browser mobile smoke                                                     | Passed                     | `/join` and landing checked at 390x844; no horizontal overflow (`scrollWidth = clientWidth = 390`); console clean. Screenshots saved under `/tmp/drawi-join-qa-2026-06-25`. |
| Privacy `pnpm --filter @drawi/web test -- apps/web/tests/domain.test.ts` | Passed                     | Focused domain suite passed after adding privacy-mode and sync-access boundary tests.                                                                                       |
| Privacy `pnpm --filter @drawi/web test`                                  | Passed                     | 3 test files, 24 tests passed. A first parallel run timed out in `sync-token.test.ts`, then passed immediately when rerun without parallel Prettier load.                   |
| Privacy `pnpm format:check`                                              | Passed                     | `All matched files use Prettier code style!`                                                                                                                                |
| Privacy `pnpm lint`                                                      | Passed                     | `eslint .` completed successfully.                                                                                                                                          |
| Privacy `pnpm typecheck`                                                 | Passed                     | Web and sync worker `tsc --noEmit` completed successfully after restoring tracked `next-env.d.ts` to the dev route-types import.                                            |
| Privacy `pnpm --filter @drawi/web test:coverage`                         | Passed                     | 100% statements, branches, functions, and lines: 97/97 statements, 69/69 branches, 35/35 functions, 81/81 lines.                                                            |
| Privacy `pnpm build`                                                     | Passed                     | Next production build and sync worker Wrangler dry-run build completed successfully.                                                                                        |
| Privacy Browser public smoke                                             | Passed                     | Landing and `/join` checked on desktop plus 390x844 mobile; no horizontal overflow and console clean. Screenshots saved under `/tmp/drawi-privacy-qa-2026-06-25`.           |

## Known risks and blockers

- The app still depends on tldraw in production code and environment names; this is explicitly not yet compliant with the target licensing end state.
- User-requested YouTube-like public profile, explicit board privacy modes, and Excalidraw/own-board-stack replacement are not complete yet.
- Board privacy data model and controls exist, but the generated migration has not been applied to the local/user database in this session.
- Public profile pages and public/link read-only board routes are still missing, so T004 is not complete even though the schema/domain/UI foundation is in place.
- Checkpoint metadata exists, but checkpoint JSON payload upload is not implemented.
- Restore-as-new-board records provenance, but does not load checkpoint content into the new room.
- There is no real Postgres integration test harness yet.
- There is no Playwright E2E configuration yet.
- Authenticated Browser screenshots were not run for the new privacy controls because the additive migration was generated but not applied to the local/user database during this session.
- Chrome DevTools MCP tools required by `cloudflare:web-perf` were not exposed in this session; Browser QA was used, but Core Web Vitals trace/audit was not run.
- Browser dev logs can contain extension-injected hydration noise with attributes such as `bis_skin_checked`; final QA on `localhost` for the changed pages reported no console errors or warnings.
- `pnpm install --frozen-lockfile` needs CI/noninteractive configuration in this environment.

## Exact next task

Continue T004/T005: apply or provision a disposable migrated test database, then add public profile pages with a YouTube-like board grid that lists only `public` boards, plus an intentional read-only public/link board route that honors `public`, `private_link`, and `session_link` without granting edit or sync-upload access.
