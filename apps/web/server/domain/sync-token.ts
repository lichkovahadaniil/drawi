import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "../env/server";
import { SYNC_ACCESS_COOKIE_TTL_SECONDS } from "./sync-access";
import type { BoardPermission } from "./types";

export interface SyncAccessClaims {
  userId: string;
  boardId: string;
  roomId: string;
  permission: BoardPermission;
  sessionId: string;
  exp: number;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", getServerEnv().SYNC_COOKIE_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createSyncCookieValue(
  claims: Omit<SyncAccessClaims, "exp">,
  ttlSeconds = SYNC_ACCESS_COOKIE_TTL_SECONDS,
) {
  const payload = base64Url(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySyncCookieValue(value: string): SyncAccessClaims | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SyncAccessClaims;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
  return claims;
}
