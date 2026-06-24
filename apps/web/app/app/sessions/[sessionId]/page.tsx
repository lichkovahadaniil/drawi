import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborativeBoard } from "@/features/board/collaborative-board";
import { PrivateNotesPanel } from "@/features/board/private-notes-panel";
import { LiveKitPanel } from "@/features/session/livekit-panel";
import { canEditBoard } from "@/server/domain/permissions";
import { getMyNote } from "@/server/services/notes-actions";
import { getSessionPage } from "@/server/services/queries";
import { endSessionAction, leaveSessionAction } from "@/server/services/session-actions";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { sessionId } = await params;
  const { invite } = await searchParams;
  const data = await getSessionPage(sessionId);
  if (!data || !data.currentMembership) notFound();

  const isTutor = data.currentMembership.role === "tutor";
  const canEdit = canEditBoard(data.user, data.board, []);
  const noteBody = await getMyNote(data.board.id);
  const inviteUrl = invite
    ? `${process.env.APP_URL ?? "http://localhost:3000"}/join/${invite}`
    : null;

  return (
    <main className="grid min-h-[calc(100vh-120px)] gap-4">
      <header className="drawi-panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {data.currentMembership.role}
          </p>
          <h1 className="text-2xl font-black">{data.liveSession.title}</h1>
          {inviteUrl ? (
            <p className="mt-1 break-all text-sm text-[var(--ink-2)]">Invite: {inviteUrl}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/boards/${data.board.id}`} className="drawi-button secondary">
            Board details
          </Link>
          {isTutor ? (
            <form action={endSessionAction.bind(null, data.liveSession.id)}>
              <button className="drawi-button" type="submit">
                End session
              </button>
            </form>
          ) : (
            <form action={leaveSessionAction.bind(null, data.liveSession.id)}>
              <button className="drawi-button secondary" type="submit">
                Leave
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="grid gap-3">
          <div className="flex gap-2 text-sm font-bold">
            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary)]">
              Board
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent)]">
              My notes
            </span>
          </div>
          <CollaborativeBoard
            boardId={data.board.id}
            roomId={data.board.roomId}
            mode={canEdit ? "edit" : "view"}
          />
        </section>
        <aside className="grid content-start gap-4">
          <LiveKitPanel sessionId={data.liveSession.id} />
          <PrivateNotesPanel boardId={data.board.id} initialBody={noteBody} />
        </aside>
      </div>
    </main>
  );
}
