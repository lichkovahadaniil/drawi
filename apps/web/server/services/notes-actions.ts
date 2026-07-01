"use server";

import { and, eq, sql } from "drizzle-orm";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import { boardAccess, boards, studentNotes } from "../db/schema";
import { canReadStudentNote, canUsePrivateNotes, canWriteStudentNote } from "../domain/permissions";

export async function getMyNote(boardId: string) {
  const user = await getRequiredUser();
  if (!user) return "";
  if (!canReadStudentNote(user, user.id)) return "";

  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!board) return "";

  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, boardId), eq(boardAccess.userId, user.id)));
  if (!canUsePrivateNotes(user, board, accessRows)) return "";

  const [note] = await db
    .select()
    .from(studentNotes)
    .where(and(eq(studentNotes.boardId, boardId), eq(studentNotes.studentId, user.id)))
    .limit(1);
  return note?.body ?? "";
}

export async function saveStudentNoteAction(boardId: string, body: string) {
  const user = await getRequiredUser();
  if (!user) throw new Error("Unauthenticated.");
  if (!canWriteStudentNote(user, user.id)) throw new Error("Forbidden.");

  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  if (!board) throw new Error("Board not found.");

  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, boardId), eq(boardAccess.userId, user.id)));
  if (!canUsePrivateNotes(user, board, accessRows)) throw new Error("Forbidden.");

  await db
    .insert(studentNotes)
    .values({
      boardId,
      studentId: user.id,
      body: body.slice(0, 20_000),
    })
    .onConflictDoUpdate({
      target: [studentNotes.boardId, studentNotes.studentId],
      set: {
        body: body.slice(0, 20_000),
        revision: sql`${studentNotes.revision} + 1`,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}
