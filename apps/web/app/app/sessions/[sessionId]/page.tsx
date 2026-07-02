import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DoorOpen, Flag, Save } from "lucide-react";
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
  if (data.currentMembership.leftAt) redirect("/app/boards");
  if (data.liveSession.status !== "live") redirect(`/app/boards/${data.board.id}`);

  const isTutor = data.currentMembership.role === "tutor";
  const canEdit = isTutor || data.currentMembership.canEditBoard;
  const noteBody = await getMyNote(data.board.id);
  const inviteUrl = invite
    ? `${process.env.APP_URL ?? "http://localhost:3000"}/join/${invite}`
    : null;

  const sessionExitControl = isTutor ? (
    <details className="group relative">
      <summary className="drawi-button secondary min-h-10 cursor-pointer select-none px-3 py-2 text-xs !text-[var(--danger)] marker:hidden [&::-webkit-details-marker]:hidden">
        <Flag aria-hidden="true" className="size-4" />
        End lesson
      </summary>
      <div className="drawi-panel absolute bottom-[calc(100%+0.6rem)] right-0 z-40 grid w-[min(20rem,calc(100vw-2rem))] gap-3 p-3 text-left">
        <div className="grid gap-1">
          <p className="text-sm font-black text-[var(--ink-0)]">End this lesson?</p>
          <p className="text-pretty text-xs font-semibold leading-5 text-[var(--ink-2)]">
            Drawi will create a session-end checkpoint, keep the board privacy unchanged, and open
            the saved board page.
          </p>
        </div>
        <form action={endSessionAction.bind(null, data.liveSession.id)}>
          <button
            className="drawi-button w-full !bg-[var(--danger)] !text-white hover:!bg-[var(--danger)]"
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            End and save
          </button>
        </form>
      </div>
    </details>
  ) : (
    <form action={leaveSessionAction.bind(null, data.liveSession.id)}>
      <button className="drawi-button secondary min-h-10 px-3 py-2 text-xs" type="submit">
        <DoorOpen aria-hidden="true" className="size-4" />
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
