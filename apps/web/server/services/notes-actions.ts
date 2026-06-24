"use server";

import { and, eq, sql } from "drizzle-orm";
import { getRequiredUser } from "../auth/auth";
import { getDb } from "../db/client";
import { studentNotes } from "../db/schema";
import { canReadStudentNote, canWriteStudentNote } from "../domain/permissions";

export async function getMyNote(boardId: string) {
  const user = await getRequiredUser();
  if (!user) return "";
  if (!canReadStudentNote(user, user.id)) return "";

  const [note] = await getDb()
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

  await getDb()
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
