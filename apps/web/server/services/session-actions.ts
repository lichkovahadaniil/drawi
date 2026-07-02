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
  profiles,
  sessionMemberships,
} from "../db/schema";
import { isBoardVisibility, parseBoardVisibilityInput } from "../domain/board-visibility";
import { canDeleteBoard, canManageBoard } from "../domain/permissions";
import type { BoardVisibility } from "../domain/types";
import {
  createInviteCode,
  hashInviteCode,
  isInviteExpired,
  normalizeInviteCodeInput,
} from "../domain/invites";
import { writeCheckpointSnapshot } from "./checkpoint-snapshots";

function parseBoardVisibilityUpdateInput(value: FormDataEntryValue | null): BoardVisibility {
  if (!isBoardVisibility(value)) {
    throw new Error("Choose a valid board visibility.");
  }
  return value;
}

export async function startLessonAction(formData: FormData) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const title = String(formData.get("title") ?? "Untitled lesson")
    .trim()
    .slice(0, 120);
  const visibility = parseBoardVisibilityInput(formData.get("visibility"));
  const db = getDb();
  const inviteCode = createInviteCode();

  const result = await db.transaction(async (tx) => {
    const [board] = await tx
      .insert(boards)
      .values({
        ownerId: user.id,
        title,
        roomId: crypto.randomUUID(),
        visibility,
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

export async function joinByCodeAction(formData: FormData) {
  const inviteCode = normalizeInviteCodeInput(String(formData.get("inviteCode") ?? ""));
  if (!inviteCode) {
    throw new Error("Enter a lesson code.");
  }

  redirect(`/join/${encodeURIComponent(inviteCode)}`);
}

export async function endSessionAction(sessionId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const [liveSession] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
  if (!liveSession) throw new Error("Session not found.");

  const [board] = await db.select().from(boards).where(eq(boards.id, liveSession.boardId));
  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, liveSession.boardId), eq(boardAccess.userId, user.id)));
  if (!board || !canManageBoard(user, board, accessRows)) throw new Error("Forbidden.");

  if (liveSession.status === "ended") {
    redirect(`/app/boards/${liveSession.boardId}`);
  }

  const snapshotKey = `checkpoints/${liveSession.boardId}/${crypto.randomUUID()}.json`;
  await writeCheckpointSnapshot({ roomId: board.roomId, storageKey: snapshotKey });

  await db.transaction(async (tx) => {
    await tx
      .update(liveSessions)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(eq(liveSessions.id, sessionId));

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
  revalidatePath("/app/boards");
  revalidatePath(`/app/boards/${liveSession.boardId}`);
  const [ownerProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, board.ownerId))
    .limit(1);
  if (ownerProfile) {
    revalidatePath(`/u/${ownerProfile.handle}`);
  }
  redirect(`/app/boards/${liveSession.boardId}`);
}

export async function deleteBoardAction(boardId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!board) throw new Error("Board not found.");

  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, board.id), eq(boardAccess.userId, user.id)));

  if (!canDeleteBoard(user, board, accessRows)) {
    throw new Error("Forbidden.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(boards)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(boards.id, board.id));

    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "board.deleted",
      entityType: "board",
      entityId: board.id,
    });
  });

  revalidatePath("/app");
  revalidatePath("/app/boards");
  redirect("/app/boards");
}

export async function updateBoardVisibilityAction(boardId: string, formData: FormData) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");

  const visibility = parseBoardVisibilityUpdateInput(formData.get("visibility"));
  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!board) throw new Error("Board not found.");

  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, board.id), eq(boardAccess.userId, user.id)));

  if (!canManageBoard(user, board, accessRows)) {
    throw new Error("Forbidden.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(boards)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(boards.id, board.id));

    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "board.visibility_updated",
      entityType: "board",
      entityId: board.id,
    });
  });

  revalidatePath("/app");
  revalidatePath("/app/boards");
  revalidatePath(`/app/boards/${board.id}`);
  const [ownerProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, board.ownerId))
    .limit(1);
  if (ownerProfile) {
    revalidatePath(`/u/${ownerProfile.handle}`);
  }
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
