import "server-only";
import { and, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { getRequiredUser, getServerSession } from "../auth/auth";
import { getDb } from "../db/client";
import {
  boardAccess,
  boards,
  checkpoints,
  friendships,
  libraryItems,
  liveSessions,
  profiles,
  sessionMemberships,
  user as users,
} from "../db/schema";
import { normalizeHandle } from "../domain/handles";
import {
  type ProfileBoardTab,
  canListBoardOnProfile,
  canViewChannel,
  chooseSearchProfileTab,
  getFriendshipState,
} from "../domain/profile-privacy";
import type { Actor, FriendshipRecord } from "../domain/types";

type BoardRow = typeof boards.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;
type FriendshipRow = typeof friendships.$inferSelect;
type PersonSummary = { userId: string; displayName: string; handle: string | null };
type EnrichedFriendship = { friendship: FriendshipRow; person: PersonSummary };
type JoinedBoardCandidate = { board: BoardRow; activityAt: Date };
type ProfileSearchResult = {
  profile: ProfileRow;
  friendshipState: ReturnType<typeof getFriendshipState>;
  tab: ReturnType<typeof chooseSearchProfileTab>;
  createdBoardCount: number;
  joinedBoardCount: number;
  href: string;
};

function parseProfileBoardTab(tab: string | undefined): ProfileBoardTab {
  return tab === "joined" || tab === "learning" ? "joined" : "created";
}

export async function getMyDashboard() {
  const user = await getRequiredUser();
  if (!user) return null;
  const db = getDb();
  const items = await db
    .select({
      libraryItem: libraryItems,
      board: boards,
    })
    .from(libraryItems)
    .innerJoin(boards, eq(libraryItems.boardId, boards.id))
    .where(and(eq(libraryItems.userId, user.id), ne(boards.status, "deleted")))
    .orderBy(desc(libraryItems.createdAt))
    .limit(12);
  return { user, items };
}

export async function getMyBoards() {
  const dashboard = await getMyDashboard();
  if (!dashboard) return null;
  return dashboard;
}

export async function getBoardPage(boardId: string) {
  const user = await getRequiredUser();
  if (!user) return null;
  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!board) return null;

  const access = await db.select().from(boardAccess).where(eq(boardAccess.boardId, boardId));
  const boardCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.boardId, boardId))
    .orderBy(desc(checkpoints.createdAt));
  const [liveSession] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.boardId, boardId))
    .orderBy(desc(liveSessions.createdAt))
    .limit(1);
  return { user, board, access, checkpoints: boardCheckpoints, liveSession };
}

export async function getSessionPage(sessionId: string) {
  const user = await getRequiredUser();
  if (!user) return null;
  const db = getDb();
  const [liveSession] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!liveSession) return null;
  const [board] = await db.select().from(boards).where(eq(boards.id, liveSession.boardId)).limit(1);
  if (!board) return null;
  const memberships = await db
    .select()
    .from(sessionMemberships)
    .where(eq(sessionMemberships.sessionId, sessionId));
  const currentMembership = memberships.find((membership) => membership.userId === user.id);
  return { user, liveSession, board, memberships, currentMembership };
}

export async function getProfile() {
  const data = await getMyProfile();
  if (!data) return null;
  const connections = await getProfileConnections(data.user.id);
  return { ...data, ...connections };
}

export async function getMyProfile() {
  const user = await getRequiredUser();
  if (!user) return null;
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return { user, profile: profile ?? null };
}

export async function getPublicProfilePage(handle: string, tab?: string) {
  const normalizedHandle = normalizeHandle(handle);
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.normalizedHandle, normalizedHandle))
    .limit(1);
  if (!profile) return null;

  const session = await getServerSession();
  const viewer = session?.user?.id ? { id: session.user.id } : null;
  const friendship = await getFriendshipBetween(viewer?.id, profile.userId);
  const friendshipState = getFriendshipState(viewer, profile.userId, friendship);
  const channelVisible = canViewChannel(
    viewer,
    profile.userId,
    profile.channelVisibility,
    friendship,
  );

  const createdBoards = channelVisible
    ? await getVisibleCreatedBoards(profile, viewer, friendship, 48)
    : [];
  const joinedBoards = channelVisible
    ? await getVisibleJoinedBoards(profile.userId, viewer, 48)
    : [];

  return {
    profile,
    viewer,
    friendship,
    friendshipState,
    channelVisible,
    activeTab: parseProfileBoardTab(tab),
    createdBoards,
    joinedBoards,
  };
}

export async function getProfileSearchResults(rawQuery: string | undefined) {
  const user = await getRequiredUser();
  if (!user) return null;

  const query = String(rawQuery ?? "")
    .trim()
    .slice(0, 80);
  if (!query) {
    return { user, query, results: [] };
  }

  const db = getDb();
  const normalizedQuery = normalizeHandle(query);
  const candidates = await db
    .select()
    .from(profiles)
    .where(
      or(
        ilike(profiles.normalizedHandle, `%${normalizedQuery}%`),
        ilike(profiles.displayName, `%${query}%`),
      ),
    )
    .orderBy(desc(profiles.updatedAt))
    .limit(12);

  const results: ProfileSearchResult[] = [];
  const viewer = { id: user.id };
  for (const profile of candidates) {
    const friendship = await getFriendshipBetween(viewer.id, profile.userId);
    if (!canViewChannel(viewer, profile.userId, profile.channelVisibility, friendship)) {
      continue;
    }

    const createdBoards = await getVisibleCreatedBoards(profile, viewer, friendship, 3);
    const joinedBoards = await getVisibleJoinedBoards(profile.userId, viewer, 3);
    const tab = chooseSearchProfileTab(createdBoards.length, joinedBoards.length);

    results.push({
      profile,
      friendshipState: getFriendshipState(viewer, profile.userId, friendship),
      tab,
      createdBoardCount: createdBoards.length,
      joinedBoardCount: joinedBoards.length,
      href: `/u/${profile.handle}?tab=${tab}`,
    });
  }

  return { user, query, results };
}

async function getVisibleCreatedBoards(
  profile: ProfileRow,
  viewer: Actor | null,
  friendship: FriendshipRecord | null,
  limit: number,
) {
  const rows = await getDb()
    .select()
    .from(boards)
    .where(and(eq(boards.ownerId, profile.userId), ne(boards.status, "deleted")))
    .orderBy(desc(boards.createdAt))
    .limit(Math.max(limit * 4, 24));

  return rows
    .filter((board) => canListBoardOnProfile(viewer, profile.userId, board, friendship))
    .slice(0, limit);
}

async function getVisibleJoinedBoards(profileUserId: string, viewer: Actor | null, limit: number) {
  const candidateLimit = Math.max(limit * 4, 24);
  const db = getDb();
  const libraryRows = await db
    .select({ board: boards, activityAt: libraryItems.createdAt })
    .from(libraryItems)
    .innerJoin(boards, eq(libraryItems.boardId, boards.id))
    .where(
      and(
        eq(libraryItems.userId, profileUserId),
        eq(libraryItems.relationship, "learned"),
        ne(boards.ownerId, profileUserId),
        ne(boards.status, "deleted"),
      ),
    )
    .orderBy(desc(libraryItems.createdAt))
    .limit(candidateLimit);

  const accessRows = await db
    .select({ board: boards, activityAt: boardAccess.updatedAt })
    .from(boardAccess)
    .innerJoin(boards, eq(boardAccess.boardId, boards.id))
    .where(
      and(
        eq(boardAccess.userId, profileUserId),
        isNull(boardAccess.revokedAt),
        ne(boards.ownerId, profileUserId),
        ne(boards.status, "deleted"),
      ),
    )
    .orderBy(desc(boardAccess.updatedAt))
    .limit(candidateLimit);

  const candidatesByBoardId = new Map<string, JoinedBoardCandidate>();
  for (const row of [...libraryRows, ...accessRows]) {
    const existing = candidatesByBoardId.get(row.board.id);
    if (!existing || row.activityAt > existing.activityAt) {
      candidatesByBoardId.set(row.board.id, row);
    }
  }

  const visibleBoards: BoardRow[] = [];
  const candidates = Array.from(candidatesByBoardId.values()).sort(
    (first, second) => second.activityAt.getTime() - first.activityAt.getTime(),
  );
  for (const { board } of candidates) {
    const friendship = await getFriendshipBetween(viewer?.id, board.ownerId);
    if (canListBoardOnProfile(viewer, profileUserId, board, friendship)) {
      visibleBoards.push(board);
    }
  }
  return visibleBoards.slice(0, limit);
}

async function getFriendshipBetween(viewerId: string | undefined, ownerId: string) {
  if (!viewerId || viewerId === ownerId) return null;
  const [friendship] = await getDb()
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, ownerId)),
        and(eq(friendships.requesterId, ownerId), eq(friendships.addresseeId, viewerId)),
      ),
    )
    .limit(1);
  return friendship ?? null;
}

async function getProfileConnections(userId: string) {
  const rows = await getDb()
    .select()
    .from(friendships)
    .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)))
    .orderBy(desc(friendships.updatedAt));

  const incomingFriendRequests = await enrichFriendshipRows(
    rows.filter((row) => row.status === "pending" && row.addresseeId === userId),
    userId,
  );
  const outgoingFriendRequests = await enrichFriendshipRows(
    rows.filter((row) => row.status === "pending" && row.requesterId === userId),
    userId,
  );
  const friends = await enrichFriendshipRows(
    rows.filter((row) => row.status === "accepted"),
    userId,
  );

  return { incomingFriendRequests, outgoingFriendRequests, friends };
}

async function enrichFriendshipRows(rows: FriendshipRow[], currentUserId: string) {
  const enrichedRows: EnrichedFriendship[] = [];
  for (const friendship of rows) {
    const otherUserId =
      friendship.requesterId === currentUserId ? friendship.addresseeId : friendship.requesterId;
    enrichedRows.push({
      friendship,
      person: await getPersonSummary(otherUserId),
    });
  }
  return enrichedRows;
}

async function getPersonSummary(userId: string) {
  const [row] = await getDb()
    .select({
      user: users,
      profile: profiles,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return {
    userId,
    displayName: row?.profile?.displayName ?? row?.user.name ?? "Drawi user",
    handle: row?.profile?.handle ?? null,
  };
}
