import { notFound } from "next/navigation";
import { CollaborativeBoard } from "@/features/board/collaborative-board";
import { PrivateNotesPanel } from "@/features/board/private-notes-panel";
import { getMyNote } from "@/server/services/notes-actions";
import { getBoardPage } from "@/server/services/queries";
import {
  createCheckpointAction,
  restoreCheckpointAsNewBoardAction,
} from "@/server/services/checkpoint-actions";
import { canEditBoard, canManageBoard, canViewBoard } from "@/server/domain/permissions";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const data = await getBoardPage(boardId);
  if (!data) notFound();

  const canView = canViewBoard(data.user, data.board, data.access);
  if (!canView) notFound();
  const canEdit = canEditBoard(data.user, data.board, data.access);
  const canManage = canManageBoard(data.user, data.board, data.access);
  const noteBody = await getMyNote(data.board.id);

  return (
    <main className="grid gap-5">
      <header className="drawi-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {canEdit ? "Editable board" : "Read-only board"}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--ink-0)]">
            {data.board.title}
          </h1>
        </div>
        {canManage ? (
          <form action={createCheckpointAction.bind(null, data.board.id)}>
            <button className="drawi-button secondary" type="submit">
              Create checkpoint
            </button>
          </form>
        ) : null}
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CollaborativeBoard
          boardId={data.board.id}
          roomId={data.board.roomId}
          mode={canEdit ? "edit" : "view"}
        />
        <aside className="grid content-start gap-4">
          <PrivateNotesPanel boardId={data.board.id} initialBody={noteBody} />
          <section className="drawi-panel grid gap-3 p-4">
            <h2 className="font-black">Checkpoints</h2>
            {data.checkpoints.length ? (
              data.checkpoints.map((checkpoint) => (
                <form
                  key={checkpoint.id}
                  action={restoreCheckpointAsNewBoardAction.bind(null, checkpoint.id)}
                >
                  <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-[var(--line-subtle)] py-3">
                    <div>
                      <p className="font-bold text-[var(--ink-0)]">{checkpoint.label}</p>
                      <p className="text-xs text-[var(--ink-2)]">{checkpoint.source}</p>
                    </div>
                    {canManage ? (
                      <button className="drawi-button secondary" type="submit">
                        Restore as new
                      </button>
                    ) : null}
                  </div>
                </form>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-2)]">No checkpoints yet.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
