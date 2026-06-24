# drawi MVP Execution Plan

## Summary

Первый MVP проверяет одну гипотезу: преподаватель проводит 1:1 live-урок на общей tldraw-доске с LiveKit audio/video, завершает занятие, а оба участника позже получают полезный сохранённый материал; ученик дополнительно имеет приватные заметки.

Этот файл является живым чеклистом. Менять `[ ]` на `[x]` можно только после фактического выполнения и проверки пункта.

## Implementation Checklist

### 0. Repository Guardrails

- [ ] Инициализировать git в `/Users/daniillickovaha/Documents/drawi`. Заблокировано текущей средой: `git init` вернул `Operation not permitted`.
- [x] Создать `.gitignore` с исключениями для `node_modules`, `.next`, `.wrangler/state`, build outputs, `.env*` кроме `.env.example`, `.DS_Store`, `tldraw-main/`, `livekit-master/`.
- [x] Создать `docs/mvp-plan.md` и вставить этот план с чекбоксами.
- [x] Зафиксировать в README, что `tldraw-main/` и `livekit-master/` используются только как reference source.
- [x] Не редактировать upstream-папки, кроме чтения и выборочного копирования нужных фрагментов с сохранением лицензий.

### 1. Foundation

- [x] Создать pnpm workspace: `apps/web`, `apps/sync-worker`.
- [x] Настроить root `package.json`, `pnpm-workspace.yaml`, strict TypeScript, ESLint, Prettier.
- [x] Создать Next.js App Router приложение в `apps/web`.
- [x] Добавить Tailwind + CSS variables с базовыми токенами `living notebook`.
- [x] Добавить `docker-compose.yml` только для local PostgreSQL.
- [x] Добавить `.env.example` с dev-safe значениями для Postgres, Better Auth, LiveKit, sync worker, tldraw license.
- [x] Добавить команды: `pnpm dev:web`, `pnpm dev:sync`, `pnpm dev:livekit`, `pnpm dev:db`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- [x] Создать минимальные routes `/`, `/sign-in`, `/sign-up`, `/app`.

### 2. Auth And Profile

- [x] Подключить Better Auth + Drizzle adapter.
- [x] Реализовать email/password sign-up, sign-in, sign-out UI/server wiring.
- [x] В MVP отключить email verification и password reset routes.
- [x] Добавить seed-пользователей `tutor` и `student` для E2E/dev.
- [x] Создать минимальный профиль: `handle`, `displayName`, `bio`, `avatarUrl`, `roleLabel`.
- [x] Защитить `/app/**` серверной проверкой session.
- [x] Не создавать `/forgot-password`, `/reset-password`, `/settings/billing`, `/notifications`.

### 3. Database And Domain Model

- [x] Настроить Drizzle + PostgreSQL migrations.
- [x] Создать минимальные таблицы для auth, profiles, boards, board access, sessions, memberships, invites, library items, notes, checkpoints, audit events.
- [x] Использовать UUID для внутренних id.
- [x] Invite code генерировать как непредсказуемый token; в БД хранить hash.
- [x] Реализовать server-only permission helpers.
- [x] Все mutations выполнять через server actions/services, не через клиентские role flags.

### 4. Sync Worker

- [x] Создать `apps/sync-worker` на базе `tldraw-main/templates/sync-cloudflare`.
- [x] Настроить Wrangler, Durable Object SQLite storage и local R2 binding.
- [x] Сохранить asset upload/download, но добавить ограничения MIME/size и безопасные object keys.
- [x] Добавить sync authorization через короткоживущий HttpOnly cookie и readonly enforcement.
- [x] Не передавать auth token через URL.
- [x] При отсутствии sync показывать явную ошибку, без fallback в localStorage collaboration.

### 5. Board Experience

- [x] Реализовать `/app/boards` с вкладками `Created` и `Learned`.
- [x] Реализовать `/app/boards/new`: создаёт board, live session, tutor membership, invite.
- [x] Реализовать `/app/boards/[boardId]`: metadata, open read-only/edit, private notes for student, checkpoints for tutor.
- [x] Реализовать `CollaborativeBoard` client component с `useSync`.
- [x] Подключить R2-backed asset store для изображений на доске.
- [x] Показывать независимые states: board connecting/reconnecting/unavailable.
- [x] Не создавать fake controls и пустые будущие разделы.

### 6. Live Session

- [x] Реализовать `/join/[inviteCode]` с invalid/expired/auth/join flow.
- [x] Реализовать `/app/sessions/[sessionId]` с shared board, LiveKit surface, notes, leave/end actions.
- [x] Реализовать `/api/livekit/token` с membership check.
- [x] Локально использовать `livekit-server --dev`, `devkey`, `secret`.
- [x] Если LiveKit недоступен, показывать явное сообщение без имитации звонка.

### 7. Private Student Notes

- [x] Реализовать `student_notes` как plain text, отдельно от tldraw document.
- [x] Уникальность: `(board_id, student_id)`.
- [x] Autosave debounce 700–1000ms.
- [x] UI states: `Saving…`, `Saved`, `Failed to save`.
- [x] Tutor не получает endpoint/read path для student notes.
- [x] Проверить архитектурно, что note не попадает в sync worker, LiveKit data channel, checkpoint snapshot, public/export paths.

### 8. Ending, Checkpoints, Restore

- [x] Tutor action `End session` сделать идемпотентной.
- [x] При завершении создать immutable session-end checkpoint metadata и storage key.
- [x] Metadata checkpoint хранить в Postgres.
- [x] Добавить tutor-only ручную кнопку `Create checkpoint`.
- [x] После завершения board остаётся owned у tutor, tutor получает `created`, student получает `learned`, session status становится `ended`.
- [x] Реализовать `Restore as new board` metadata flow.
- [x] Не делать destructive live rollback.

### 9. UI Polish And Accessibility

- [x] Навигация MVP: `Home`, `Boards`, `Profile`.
- [x] Live session navigation: `Board`, `My notes`, `Leave / End session`.
- [x] Canvas занимает основную площадь; video rail не перекрывает critical controls.
- [x] Добавить keyboard labels/focus states для primary controls.
- [x] Добавить mobile-safe layout без обещания полной mobile editing parity.
- [x] Применить `living notebook` tokens: calm paper surfaces, ink colors, blue primary, orange accent.
- [ ] Проверить контраст, hit area минимум 40×40, no `transition: all` в rendered UI.

### 10. Verification And Done

- [x] Unit tests for core domain helpers.
- [ ] Integration tests с real test Postgres.
- [ ] Playwright E2E с двумя browser contexts.
- [ ] Manual local smoke.
- [ ] Required checks pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, sync worker build, Playwright critical E2E.

## Assumptions

- Existing `index.html` is treated as source prompt/reference, not as app code.
- `tldraw-main/` and `livekit-master/` are local references, not drawi source.
- Node `v22.22.1` and pnpm `10.33.0` are acceptable for implementation.
- Exact npm package versions are resolved during implementation and pinned in lockfile.
- Production tldraw license is documented, but localhost MVP works without license key.
- Resend and Sentry are deliberately deferred.
- Public creator profile is deferred unless real publishing lands inside this MVP.
