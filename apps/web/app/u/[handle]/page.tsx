import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { BOARD_VISIBILITY_LABELS } from "@/server/domain/board-visibility";
import { CHANNEL_VISIBILITY_LABELS } from "@/server/domain/profile-privacy";
import {
  respondFriendRequestAction,
  sendFriendRequestAction,
} from "@/server/services/profile-actions";
import { getPublicProfilePage } from "@/server/services/queries";

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { handle } = await params;
  const { tab } = await searchParams;
  const data = await getPublicProfilePage(handle, tab);
  if (!data) notFound();

  const activeBoards = data.activeTab === "learning" ? data.learningBoards : data.teachingBoards;

  return (
    <main className="mx-auto grid max-w-6xl gap-6">
      <header className="drawi-panel grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
            @{data.profile.handle}
          </p>
          <h1 className="mt-2 text-balance text-4xl font-black tracking-tight text-[var(--ink-0)]">
            {data.profile.displayName}
          </h1>
          <p className="mt-2 text-sm font-bold text-[var(--ink-2)]">
            {data.profile.roleLabel} · {CHANNEL_VISIBILITY_LABELS[data.profile.channelVisibility]}
          </p>
          {data.channelVisible && data.profile.bio ? (
            <p className="mt-4 max-w-3xl text-pretty leading-7 text-[var(--ink-1)]">
              {data.profile.bio}
            </p>
          ) : null}
        </div>
        <ProfileFriendAction
          friendshipId={data.friendship?.id ?? null}
          handle={data.profile.handle}
          profileUserId={data.profile.userId}
          state={data.friendshipState}
          viewerId={data.viewer?.id ?? null}
        />
      </header>

      {data.channelVisible ? (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Profile tabs">
            <Link
              className={`drawi-button secondary ${data.activeTab === "teaching" ? "" : "opacity-70"}`}
              href={`/u/${data.profile.handle}?tab=teaching` as Route}
            >
              Teaching
              <span className="tabular-nums">{data.teachingBoards.length}</span>
            </Link>
            <Link
              className={`drawi-button secondary ${data.activeTab === "learning" ? "" : "opacity-70"}`}
              href={`/u/${data.profile.handle}?tab=learning` as Route}
            >
              Learning
              <span className="tabular-nums">{data.learningBoards.length}</span>
            </Link>
          </nav>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeBoards.length ? (
              activeBoards.map((board) => <ChannelBoardCard key={board.id} board={board} />)
            ) : (
              <div className="drawi-panel p-5 text-sm text-[var(--ink-2)]">Nothing here yet.</div>
            )}
          </section>
        </>
      ) : (
        <section className="drawi-panel p-6">
          <h2 className="text-2xl font-black tracking-tight text-[var(--ink-0)]">
            Private channel
          </h2>
          <p className="mt-2 text-pretty text-[var(--ink-2)]">
            This channel is not visible with your current friendship status.
          </p>
        </section>
      )}
    </main>
  );
}

function ProfileFriendAction({
  friendshipId,
  handle,
  profileUserId,
  state,
  viewerId,
}: {
  friendshipId: string | null;
  handle: string;
  profileUserId: string;
  state: "self" | "friends" | "request_sent" | "request_received" | "none";
  viewerId: string | null;
}) {
  if (state === "self") {
    return (
      <Link className="drawi-button secondary" href="/app/profile">
        Edit channel
      </Link>
    );
  }
  if (state === "friends") {
    return <span className="drawi-button secondary">Friends</span>;
  }
  if (state === "request_sent") {
    return <span className="drawi-button secondary">Request sent</span>;
  }
  if (state === "request_received" && friendshipId) {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={respondFriendRequestAction.bind(null, friendshipId, "accepted")}>
          <button className="drawi-button secondary" type="submit">
            Accept
          </button>
        </form>
        <form action={respondFriendRequestAction.bind(null, friendshipId, "declined")}>
          <button className="drawi-button secondary" type="submit">
            Decline
          </button>
        </form>
      </div>
    );
  }
  if (!viewerId) {
    return (
      <Link className="drawi-button secondary" href={`/sign-in?next=/u/${handle}` as Route}>
        Sign in
      </Link>
    );
  }
  return (
    <form action={sendFriendRequestAction.bind(null, profileUserId)}>
      <button className="drawi-button secondary" type="submit">
        Add friend
      </button>
    </form>
  );
}

function ChannelBoardCard({
  board,
}: {
  board: { id: string; title: string; visibility: "private" | "friends" | "public" };
}) {
  return (
    <article className="drawi-panel grid gap-3 p-3">
      <div className="drawi-board-thumb aspect-[4/3] rounded-[6px]" />
      <div>
        <h3 className="text-balance font-black text-[var(--ink-0)]">{board.title}</h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">
          {BOARD_VISIBILITY_LABELS[board.visibility]}
        </p>
      </div>
    </article>
  );
}
