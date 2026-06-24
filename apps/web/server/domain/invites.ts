import { createHash, randomBytes } from "node:crypto";

export function createInviteCode() {
  return randomBytes(18).toString("base64url");
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function isInviteExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}
