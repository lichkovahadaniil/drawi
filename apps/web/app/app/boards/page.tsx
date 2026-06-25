import Link from "next/link";
import { getMyBoards } from "@/server/services/queries";

export default async function BoardsPage() {
  const data = await getMyBoards();
  const created = data?.items.filter((item) => item.libraryItem.relationship === "created") ?? [];
  const learned = data?.items.filter((item) => item.libraryItem.relationship === "learned") ?? [];

  return (
    <main className="grid gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Boards</h1>
          <p className="mt-2 text-[var(--ink-2)]">Created and learned material from lessons.</p>
        </div>
        <Link href="/app/boards/new" className="drawi-button">
          Start lesson
        </Link>
      </header>
      <BoardSection title="Created" boards={created} />
      <BoardSection title="Learned" boards={learned} />
    </main>
  );
}

function BoardSection({
  title,
  boards,
}: {
  title: string;
  boards: NonNullable<Awaited<ReturnType<typeof getMyBoards>>>["items"];
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-black tracking-tight text-[var(--ink-0)]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {boards.length ? (
          boards.map(({ board }) => (
            <Link
              key={board.id}
              href={`/app/boards/${board.id}`}
              className="drawi-panel drawi-panel-link block p-3"
            >
              <div className="drawi-board-thumb mb-3 aspect-[4/3] rounded-[6px]" />
              <h3 className="font-black text-[var(--ink-0)]">{board.title}</h3>
              <p className="mt-1 text-sm text-[var(--ink-2)]">Open saved material</p>
            </Link>
          ))
        ) : (
          <div className="drawi-panel p-5 text-sm text-[var(--ink-2)]">Nothing here yet.</div>
        )}
      </div>
    </section>
  );
}
