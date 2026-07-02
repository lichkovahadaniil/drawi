import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUser } from "@/server/auth/auth";
import { getDb } from "@/server/db/client";
import { boardAccess, boards } from "@/server/db/schema";
import {
  SYNC_ACCESS_COOKIE_NAME,
  SYNC_ACCESS_COOKIE_TTL_SECONDS,
} from "@/server/domain/sync-access";
import { createSyncCookieValue } from "@/server/domain/sync-token";
import { canIssueSyncAccess } from "@/server/domain/permissions";

const bodySchema = z.object({
  boardId: z.uuid(),
});

export async function POST(request: Request) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  const [board] = await db.select().from(boards).where(eq(boards.id, parsed.data.boardId)).limit(1);
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const accessRows = await db
    .select()
    .from(boardAccess)
    .where(and(eq(boardAccess.boardId, board.id), eq(boardAccess.userId, user.id)));

  if (!canIssueSyncAccess(user, board, accessRows)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permission =
    board.ownerId === user.id
      ? "manage"
      : accessRows.find((row) => row.revokedAt === null)?.permission;
  if (!permission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = crypto.randomUUID();
  const cookieValue = createSyncCookieValue({
    userId: user.id,
    boardId: board.id,
    roomId: board.roomId,
    permission,
    sessionId,
  });

  const cookieStore = await cookies();
  cookieStore.set(SYNC_ACCESS_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SYNC_ACCESS_COOKIE_TTL_SECONDS,
    path: "/",
  });

  return NextResponse.json({ ok: true, sessionId, accessToken: cookieValue });
}
