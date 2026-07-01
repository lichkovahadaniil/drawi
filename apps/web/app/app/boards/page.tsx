import Link from "next/link";
import { BOARD_VISIBILITY_LABELS } from "@/server/domain/board-visibility";
import { getMyBoards } from "@/server/services/queries";
import { deleteBoardAction } from "@/server/services/session-actions";

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
      <BoardSection title="Created" boards={created} currentUserId={data?.user.id ?? ""} />
      <BoardSection title="Learned" boards={learned} currentUserId={data?.user.id ?? ""} />
    </main>
  );
}

function BoardSection({
  title,
  boards,
  currentUserId,
}: {
  title: string;
  boards: NonNullable<Awaited<ReturnType<typeof getMyBoards>>>["items"];
  currentUserId: string;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-black tracking-tight text-[var(--ink-0)]">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {boards.length ? (
          boards.map(({ board }) => {
            const canDelete = board.ownerId === currentUserId;

            return (
              <article key={board.id} className="drawi-panel grid gap-3 p-3">
                <Link href={`/app/boards/${board.id}`} className="drawi-panel-link block">
                  <div className="drawi-board-thumb mb-3 aspect-[4/3] rounded-[6px]" />
                  <h3 className="font-black text-[var(--ink-0)]">{board.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">Open saved material</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                    {BOARD_VISIBILITY_LABELS[board.visibility]}
                  </p>
                </Link>
                {canDelete ? (
                  <form action={deleteBoardAction.bind(null, board.id)}>
                    <button className="drawi-button secondary w-full" type="submit">
                      Delete board
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="drawi-panel p-5 text-sm text-[var(--ink-2)]">Nothing here yet.</div>
        )}
      </div>
    </section>
  );
}
