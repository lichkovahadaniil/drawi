import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import {
  boardAccess,
  boards,
  checkpoints,
  libraryItems,
  liveSessions,
  profiles,
  sessionMemberships,
} from "../db/schema";

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
    .where(eq(libraryItems.userId, user.id))
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
  const [profile] = await getDb().select().from(profiles).where(eq(profiles.userId, user.id));
  return { user, profile };
}

export async function getAccessibleBoardAccess(userId: string, boardId: string) {
  return getDb()
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, boardId), or(eq(boardAccess.userId, userId))));
}
