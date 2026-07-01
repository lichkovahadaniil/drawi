import { AccessToken } from "livekit-server-sdk";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createDrawiLiveKitGrant } from "@/features/session/livekit-token";
import { getRequiredUser } from "@/server/auth/auth";
import { getDb } from "@/server/db/client";
import { liveSessions, profiles, sessionMemberships } from "@/server/db/schema";
import { getServerEnv } from "@/server/env/server";
import { canIssueLiveKitToken } from "@/server/domain/permissions";

export async function GET(request: Request) {
  const user = await getRequiredUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const db = getDb();
  const [liveSession] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!liveSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const memberships = await db
    .select()
    .from(sessionMemberships)
    .where(eq(sessionMemberships.sessionId, sessionId));
  if (!canIssueLiveKitToken(user, liveSession, memberships)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [membership] = await db
    .select()
    .from(sessionMemberships)
    .where(and(eq(sessionMemberships.sessionId, sessionId), eq(sessionMemberships.userId, user.id)))
    .limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  const env = getServerEnv();
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: profile?.displayName ?? user.name ?? user.email,
    ttl: "15m",
    metadata: JSON.stringify({
      userId: user.id,
      role: membership?.role ?? "student",
      avatarUrl: profile?.avatarUrl ?? null,
    }),
  });

  token.addGrant(createDrawiLiveKitGrant(liveSession.liveKitRoomName));

  return NextResponse.json({
    token: await token.toJwt(),
    serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
  });
}
