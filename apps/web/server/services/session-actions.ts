"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import {
  auditEvents,
  boardAccess,
  boards,
  checkpoints,
  invites,
  libraryItems,
  liveSessions,
  sessionMemberships,
} from "../db/schema";
import { canManageBoard } from "../domain/permissions";
import { createInviteCode, hashInviteCode, isInviteExpired } from "../domain/invites";

export async function startLessonAction(formData: FormData) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const title = String(formData.get("title") ?? "Untitled lesson")
    .trim()
    .slice(0, 120);
  const db = getDb();
  const inviteCode = createInviteCode();

  const result = await db.transaction(async (tx) => {
    const [board] = await tx
      .insert(boards)
      .values({
        ownerId: user.id,
        title,
        roomId: crypto.randomUUID(),
      })
      .returning();
    if (!board) throw new Error("Failed to create board.");

    const [liveSession] = await tx
      .insert(liveSessions)
      .values({
        boardId: board.id,
        hostUserId: user.id,
        title,
        liveKitRoomName: `drawi-${board.roomId}`,
      })
      .returning();
    if (!liveSession) throw new Error("Failed to create session.");

    await tx.insert(sessionMemberships).values({
      sessionId: liveSession.id,
      userId: user.id,
      role: "tutor",
      canEditBoard: true,
      joinedAt: new Date(),
    });

    await tx.insert(libraryItems).values({
      userId: user.id,
      boardId: board.id,
      relationship: "created",
    });

    await tx.insert(invites).values({
      sessionId: liveSession.id,
      codeHash: hashInviteCode(inviteCode),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdByUserId: user.id,
    });

    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "session.created",
      entityType: "live_session",
      entityId: liveSession.id,
    });

    return liveSession;
  });

  revalidatePath("/app");
  redirect(`/app/sessions/${result.id}?invite=${inviteCode}`);
}

export async function joinInviteAction(inviteCode: string) {
  const user = await getRequiredUser();
  if (!user) redirect(`/sign-in?next=/join/${inviteCode}`);

  const db = getDb();
  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.codeHash, hashInviteCode(inviteCode)))
    .limit(1);

  if (!invite || invite.status !== "active" || isInviteExpired(invite.expiresAt)) {
    throw new Error("This invite is invalid or expired.");
  }

  const [liveSession] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, invite.sessionId))
    .limit(1);
  if (!liveSession || liveSession.status !== "live") {
    throw new Error("This lesson is no longer live.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(sessionMemberships)
      .values({
        sessionId: liveSession.id,
        userId: user.id,
        role: "student",
        canEditBoard: true,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sessionMemberships.sessionId, sessionMemberships.userId],
        set: {
          joinedAt: new Date(),
          leftAt: null,
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(boardAccess)
      .values({
        boardId: liveSession.boardId,
        userId: user.id,
        permission: "edit",
      })
      .onConflictDoUpdate({
        target: [boardAccess.boardId, boardAccess.userId],
        set: {
          permission: "edit",
          revokedAt: null,
          updatedAt: new Date(),
        },
      });
  });

  redirect(`/app/sessions/${liveSession.id}`);
}

export async function endSessionAction(sessionId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const [liveSession] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
  if (!liveSession) throw new Error("Session not found.");

  const [board] = await db.select().from(boards).where(eq(boards.id, liveSession.boardId));
  if (!board || !canManageBoard(user, board)) throw new Error("Forbidden.");

  if (liveSession.status === "ended") {
    redirect(`/app/boards/${liveSession.boardId}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(liveSessions)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(eq(liveSessions.id, sessionId));

    const snapshotKey = `checkpoints/${liveSession.boardId}/${crypto.randomUUID()}.json`;
    await tx.insert(checkpoints).values({
      boardId: liveSession.boardId,
      sessionId: liveSession.id,
      createdByUserId: user.id,
      label: "Session end",
      snapshotStorageKey: snapshotKey,
      source: "session_end",
    });

    const members = await tx
      .select()
      .from(sessionMemberships)
      .where(eq(sessionMemberships.sessionId, liveSession.id));
    for (const member of members) {
      await tx
        .insert(libraryItems)
        .values({
          userId: member.userId,
          boardId: liveSession.boardId,
          relationship: member.role === "tutor" ? "created" : "learned",
        })
        .onConflictDoNothing();
    }

    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "session.ended",
      entityType: "live_session",
      entityId: liveSession.id,
    });
  });

  revalidatePath("/app");
  redirect(`/app/boards/${liveSession.boardId}`);
}

export async function leaveSessionAction(sessionId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  await getDb()
    .update(sessionMemberships)
    .set({ leftAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(sessionMemberships.sessionId, sessionId), eq(sessionMemberships.userId, user.id)),
    );

  redirect("/app/boards");
}
