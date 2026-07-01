import "server-only";
import { and, desc, eq, ilike, ne, or } from "drizzle-orm";
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
  canListBoardOnChannel,
  canViewChannel,
  chooseSearchProfileView,
  getFriendshipState,
} from "../domain/profile-privacy";
import type { Actor, FriendshipRecord } from "../domain/types";

type BoardRow = typeof boards.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;
type FriendshipRow = typeof friendships.$inferSelect;
type ChannelTab = "teaching" | "learning";
type PersonSummary = { userId: string; displayName: string; handle: string | null };
type EnrichedFriendship = { friendship: FriendshipRow; person: PersonSummary };
type ProfileSearchResult = {
  profile: ProfileRow;
  friendshipState: ReturnType<typeof getFriendshipState>;
  view: ReturnType<typeof chooseSearchProfileView>;
  teachingBoardCount: number;
  learningBoardCount: number;
  href: string;
};

function parseChannelTab(tab: string | undefined): ChannelTab {
  return tab === "learning" ? "learning" : "teaching";
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
  const user = await getRequiredUser();
  if (!user) return null;
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  const connections = await getProfileConnections(user.id);
  return { user, profile, ...connections };
}

export async function getAccessibleBoardAccess(userId: string, boardId: string) {
  return getDb()
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, boardId), or(eq(boardAccess.userId, userId))));
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

  const teachingBoards = channelVisible
    ? await getVisibleTeachingBoards(profile, viewer, friendship, 48)
    : [];
  const learningBoards = channelVisible
    ? await getVisibleLearningBoards(profile.userId, viewer, 48)
    : [];

  return {
    profile,
    viewer,
    friendship,
    friendshipState,
    channelVisible,
    activeTab: parseChannelTab(tab),
    teachingBoards,
    learningBoards,
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

    const teachingBoards = await getVisibleTeachingBoards(profile, viewer, friendship, 3);
    const learningBoards = await getVisibleLearningBoards(profile.userId, viewer, 3);
    const view = chooseSearchProfileView(profile.teachingEnabled, teachingBoards.length);

    results.push({
      profile,
      friendshipState: getFriendshipState(viewer, profile.userId, friendship),
      view,
      teachingBoardCount: teachingBoards.length,
      learningBoardCount: learningBoards.length,
      href: `/u/${profile.handle}?tab=${view}`,
    });
  }

  return { user, query, results };
}

async function getVisibleTeachingBoards(
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
    .filter((board) => canListBoardOnChannel(viewer, profile.userId, board, friendship))
    .slice(0, limit);
}

async function getVisibleLearningBoards(
  profileUserId: string,
  viewer: Actor | null,
  limit: number,
) {
  const rows = await getDb()
    .select({ board: boards })
    .from(libraryItems)
    .innerJoin(boards, eq(libraryItems.boardId, boards.id))
    .where(
      and(
        eq(libraryItems.userId, profileUserId),
        eq(libraryItems.relationship, "learned"),
        ne(boards.status, "deleted"),
      ),
    )
    .orderBy(desc(libraryItems.createdAt))
    .limit(Math.max(limit * 4, 24));

  const visibleBoards: BoardRow[] = [];
  for (const { board } of rows) {
    const friendship = await getFriendshipBetween(viewer?.id, board.ownerId);
    if (canListBoardOnChannel(viewer, board.ownerId, board, friendship)) {
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
