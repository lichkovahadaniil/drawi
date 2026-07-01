import Link from "next/link";
import { BOARD_VISIBILITY_LABELS } from "@/server/domain/board-visibility";
import { getMyDashboard } from "@/server/services/queries";
import { joinByCodeAction } from "@/server/services/session-actions";

export default async function DashboardPage() {
  const data = await getMyDashboard();

  return (
    <main className="grid gap-5">
      <section className="drawi-panel drawi-dashboard-hero grid gap-5 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch">
        <div>
          <p className="drawi-kicker">Home</p>
          <h1 className="text-3xl font-black text-[var(--ink-0)]">Your lesson desk</h1>
          <p className="mt-2 max-w-2xl text-pretty text-[var(--ink-2)]">
            Start a 1:1 visual lesson or reopen recent material.
          </p>
          <div className="mt-5">
            <Link href="/app/boards/new" className="drawi-button">
              Start lesson
            </Link>
          </div>
        </div>
        <form action={joinByCodeAction} className="drawi-compact-panel grid gap-3">
          <label className="drawi-label">
            Join with code
            <input
              className="drawi-input"
              name="inviteCode"
              required
              autoComplete="off"
              placeholder="Paste lesson code"
            />
          </label>
          <button className="drawi-button secondary" type="submit">
            Join lesson
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        <div className="drawi-section-heading">
          <div>
            <p className="drawi-kicker">Library</p>
            <h2>Recent boards</h2>
          </div>
          <Link href="/app/boards" className="drawi-muted-link">
            View all
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.length ? (
            data.items.map(({ board, libraryItem }) => (
              <Link
                key={`${board.id}-${libraryItem.relationship}`}
                href={`/app/boards/${board.id}`}
                className="drawi-panel drawi-panel-link block p-4"
              >
                <p className="drawi-kicker">{libraryItem.relationship}</p>
                <h3 className="mt-2 text-lg font-black text-[var(--ink-0)]">{board.title}</h3>
                <p className="mt-3 text-sm text-[var(--ink-2)]">Open board</p>
                <p className="mt-3 inline-flex rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
                  {BOARD_VISIBILITY_LABELS[board.visibility]}
                </p>
              </Link>
            ))
          ) : (
            <div className="drawi-panel p-5 text-[var(--ink-2)]">
              No boards yet. Start a lesson to create the first shared canvas.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
