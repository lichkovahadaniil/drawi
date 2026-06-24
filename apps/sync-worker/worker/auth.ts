const COOKIE_NAME = "drawi_sync_access";

export interface SyncAccessClaims {
  userId: string;
  boardId: string;
  roomId: string;
  permission: "manage" | "edit" | "view";
  sessionId: string;
  exp: number;
}

function parseCookies(header: string | null) {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) continue;
    cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

function base64UrlToBytes(value: string) {
  const padded = value
    .padEnd(Math.ceil(value.length / 4) * 4, "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function verifySyncAccess(request: Request, env: Env, roomId: string) {
  const cookie = parseCookies(request.headers.get("cookie")).get(COOKIE_NAME);
  if (!cookie) return null;

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload, env.SYNC_COOKIE_SECRET);
  if (!timingSafeEqual(expected, signature)) return null;

  const claims = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(payload)),
  ) as SyncAccessClaims;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
  if (claims.roomId !== roomId) return null;
  return claims;
}
