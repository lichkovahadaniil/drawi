import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborativeBoard } from "@/features/board/collaborative-board";
import { PrivateNotesPanel } from "@/features/board/private-notes-panel";
import { LiveKitPanel } from "@/features/session/livekit-panel";
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
  const canEdit = isTutor || data.currentMembership.canEditBoard;
  const noteBody = await getMyNote(data.board.id);
  const inviteUrl = invite
    ? `${process.env.APP_URL ?? "http://localhost:3000"}/join/${invite}`
    : null;

  const sessionExitControl = isTutor ? (
    <form action={endSessionAction.bind(null, data.liveSession.id)}>
      <button
        className="drawi-button secondary min-h-10 px-3 py-2 text-xs text-[var(--danger)]"
        type="submit"
      >
        End session
      </button>
    </form>
  ) : (
    <form action={leaveSessionAction.bind(null, data.liveSession.id)}>
      <button className="drawi-button secondary min-h-10 px-3 py-2 text-xs" type="submit">
        Leave
      </button>
    </form>
  );

  return (
    <main className="grid min-h-[calc(100vh-120px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
      <header className="drawi-panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {data.currentMembership.role}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink-0)]">
            {data.liveSession.title}
          </h1>
          {inviteUrl ? (
            <p className="mt-1 break-all text-sm text-[var(--ink-2)]">Invite: {inviteUrl}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/boards/${data.board.id}`} className="drawi-button secondary">
            Board details
          </Link>
        </div>
      </header>

      <section className="min-h-0">
        <div className="relative min-h-[560px]">
          <CollaborativeBoard
            boardId={data.board.id}
            roomId={data.board.roomId}
            mode={canEdit ? "edit" : "view"}
          />
          <PrivateNotesPanel boardId={data.board.id} initialBody={noteBody} placement="overlay" />
        </div>
      </section>

      <section className="drawi-panel sticky bottom-3 z-30 grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <LiveKitPanel sessionId={data.liveSession.id} />
        <div className="flex items-center justify-end gap-2">{sessionExitControl}</div>
      </section>
    </main>
  );
}
