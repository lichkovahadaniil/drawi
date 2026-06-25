import Link from "next/link";
import { getMyDashboard } from "@/server/services/queries";

export default async function DashboardPage() {
  const data = await getMyDashboard();

  return (
    <main className="grid gap-6">
      <section className="drawi-panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Home</h1>
          <p className="mt-2 text-[var(--ink-2)]">
            Start a 1:1 visual lesson or reopen recent material.
          </p>
        </div>
        <Link href="/app/boards/new" className="drawi-button">
          Start lesson
        </Link>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black tracking-tight text-[var(--ink-0)]">Recent boards</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.length ? (
            data.items.map(({ board, libraryItem }) => (
              <Link
                key={`${board.id}-${libraryItem.relationship}`}
                href={`/app/boards/${board.id}`}
                className="drawi-panel drawi-panel-link block p-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">
                  {libraryItem.relationship}
                </p>
                <h3 className="mt-2 text-lg font-black text-[var(--ink-0)]">{board.title}</h3>
                <p className="mt-3 text-sm text-[var(--ink-2)]">Open board</p>
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
