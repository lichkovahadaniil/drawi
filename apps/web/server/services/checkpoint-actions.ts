"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import { auditEvents, boardAccess, boards, checkpoints, libraryItems } from "../db/schema";
import { canManageBoard, canRestoreCheckpointAsNewBoard } from "../domain/permissions";
import { restoreCheckpointSnapshot, writeCheckpointSnapshot } from "./checkpoint-snapshots";

export async function createCheckpointAction(boardId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");
  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, boardId), eq(boardAccess.userId, user.id)));
  if (!board || !canManageBoard(user, board, accessRows)) throw new Error("Forbidden.");

  const snapshotStorageKey = `checkpoints/${boardId}/${crypto.randomUUID()}.json`;
  await writeCheckpointSnapshot({ roomId: board.roomId, storageKey: snapshotStorageKey });

  await db.insert(checkpoints).values({
    boardId,
    createdByUserId: user.id,
    label: "Manual checkpoint",
    snapshotStorageKey,
    source: "manual",
  });
  revalidatePath(`/app/boards/${boardId}`);
}

export async function restoreCheckpointAsNewBoardAction(checkpointId: string) {
  const user = await getRequiredUser();
  if (!user) redirect("/sign-in");
  const db = getDb();
  const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId));
  if (!checkpoint) throw new Error("Checkpoint not found.");
  const [board] = await db.select().from(boards).where(eq(boards.id, checkpoint.boardId));
  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, checkpoint.boardId), eq(boardAccess.userId, user.id)));
  if (!board || !canRestoreCheckpointAsNewBoard(user, board, accessRows)) {
    throw new Error("Forbidden.");
  }

  const restoredRoomId = crypto.randomUUID();
  await restoreCheckpointSnapshot({
    roomId: restoredRoomId,
    storageKey: checkpoint.snapshotStorageKey,
  });

  const [copy] = await db.transaction(async (tx) => {
    const [newBoard] = await tx
      .insert(boards)
      .values({
        ownerId: user.id,
        title: `${board.title} restored`,
        roomId: restoredRoomId,
        sourceBoardId: board.id,
        sourceCheckpointId: checkpoint.id,
      })
      .returning();
    if (!newBoard) throw new Error("Failed to restore board.");
    await tx.insert(libraryItems).values({
      userId: user.id,
      boardId: newBoard.id,
      relationship: "created",
    });
    await tx.insert(auditEvents).values({
      actorUserId: user.id,
      action: "checkpoint.restored_as_new_board",
      entityType: "checkpoint",
      entityId: checkpoint.id,
    });
    return [newBoard] as const;
  });

  redirect(`/app/boards/${copy.id}`);
}
