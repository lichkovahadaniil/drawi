import { createHash, randomBytes } from "node:crypto";

export function createInviteCode() {
  return randomBytes(18).toString("base64url");
}

export function hashInviteCode(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function normalizeInviteCodeInput(input: string) {
  const trimmed = input.trim();
  const joinPathMatch = trimmed.match(/\/join\/([^/?#]+)/);
  const code = joinPathMatch?.[1] ?? trimmed;
  try {
    return decodeURIComponent(code);
  } catch {
    return code;
  }
}

export function isInviteExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}
