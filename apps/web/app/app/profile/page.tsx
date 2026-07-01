import Link from "next/link";
import type { Route } from "next";
import { Children, type ReactNode } from "react";
import {
  CHANNEL_VISIBILITIES,
  CHANNEL_VISIBILITY_DESCRIPTIONS,
  CHANNEL_VISIBILITY_LABELS,
  DEFAULT_CHANNEL_VISIBILITY,
} from "@/server/domain/profile-privacy";
import { getProfile } from "@/server/services/queries";
import { respondFriendRequestAction, upsertProfileAction } from "@/server/services/profile-actions";

export default async function ProfilePage() {
  const data = await getProfile();
  const incomingRequests = data?.incomingFriendRequests ?? [];
  const outgoingRequests = data?.outgoingFriendRequests ?? [];
  const friends = data?.friends ?? [];

  return (
    <main className="mx-auto grid max-w-4xl gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Profile</h1>
        <p className="mt-2 text-[var(--ink-2)]">Channel identity and social privacy.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form action={upsertProfileAction} className="drawi-panel grid gap-4 p-6">
          <label className="drawi-label">
            Handle
            <input
              className="drawi-input"
              name="handle"
              defaultValue={data?.profile?.handle ?? ""}
              required
              minLength={3}
            />
          </label>
          <label className="drawi-label">
            Display name
            <input
              className="drawi-input"
              name="displayName"
              defaultValue={data?.profile?.displayName ?? data?.user.name ?? ""}
              required
            />
          </label>
          <label className="drawi-label">
            Role label
            <input
              className="drawi-input"
              name="roleLabel"
              defaultValue={data?.profile?.roleLabel ?? "Learner"}
            />
          </label>
          <label className="drawi-label">
            Channel privacy
            <select
              className="drawi-input"
              name="channelVisibility"
              defaultValue={data?.profile?.channelVisibility ?? DEFAULT_CHANNEL_VISIBILITY}
            >
              {CHANNEL_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {CHANNEL_VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </select>
            <span className="text-sm font-medium leading-6 text-[var(--ink-2)]">
              {
                CHANNEL_VISIBILITY_DESCRIPTIONS[
                  data?.profile?.channelVisibility ?? DEFAULT_CHANNEL_VISIBILITY
                ]
              }
            </span>
          </label>
          <label className="flex min-h-10 items-center gap-3 text-sm font-bold text-[var(--ink-1)]">
            <input
              className="size-5 accent-[var(--accent)]"
              name="teachingEnabled"
              type="checkbox"
              defaultChecked={data?.profile?.teachingEnabled ?? false}
            />
            Teaching channel
          </label>
          <label className="drawi-label">
            Bio
            <textarea
              className="drawi-input min-h-32"
              name="bio"
              defaultValue={data?.profile?.bio ?? ""}
              maxLength={280}
            />
          </label>
          <button className="drawi-button" type="submit">
            Save profile
          </button>
        </form>

        <section className="drawi-panel grid content-start gap-5 p-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[var(--ink-0)]">Friends</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-2)]">
              Requests and accepted channel friends.
            </p>
          </div>

          <ConnectionList title="Requests" emptyLabel="No pending requests.">
            {incomingRequests.map(({ friendship, person }) => (
              <div
                key={friendship.id}
                className="grid gap-3 border-t-2 border-dashed border-[var(--line-subtle)] pt-3"
              >
                <PersonLine person={person} />
                <div className="flex flex-wrap gap-2">
                  <form action={respondFriendRequestAction.bind(null, friendship.id, "accepted")}>
                    <button className="drawi-button secondary" type="submit">
                      Accept
                    </button>
                  </form>
                  <form action={respondFriendRequestAction.bind(null, friendship.id, "declined")}>
                    <button className="drawi-button secondary" type="submit">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </ConnectionList>

          <ConnectionList title="Sent" emptyLabel="No sent requests.">
            {outgoingRequests.map(({ friendship, person }) => (
              <div
                key={friendship.id}
                className="border-t-2 border-dashed border-[var(--line-subtle)] pt-3"
              >
                <PersonLine person={person} />
              </div>
            ))}
          </ConnectionList>

          <ConnectionList title="Friends" emptyLabel="No friends yet.">
            {friends.map(({ friendship, person }) => (
              <div
                key={friendship.id}
                className="border-t-2 border-dashed border-[var(--line-subtle)] pt-3"
              >
                <PersonLine person={person} />
              </div>
            ))}
          </ConnectionList>
        </section>
      </div>
    </main>
  );
}

function ConnectionList({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  const hasChildren = Children.count(children) > 0;

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
        {title}
      </h3>
      {hasChildren ? children : <p className="text-sm text-[var(--ink-2)]">{emptyLabel}</p>}
    </div>
  );
}

function PersonLine({
  person,
}: {
  person: { displayName: string; handle: string | null; userId: string };
}) {
  const label = person.handle ? `@${person.handle}` : person.userId;
  const profileHref = person.handle ? (`/u/${person.handle}` as Route) : null;
  return (
    <div>
      <p className="font-bold text-[var(--ink-0)]">{person.displayName}</p>
      {profileHref ? (
        <Link className="drawi-muted-link text-sm" href={profileHref}>
          {label}
        </Link>
      ) : (
        <p className="text-sm text-[var(--ink-2)]">{label}</p>
      )}
    </div>
  );
}
