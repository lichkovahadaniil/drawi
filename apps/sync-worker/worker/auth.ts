const COOKIE_NAME = "drawi_sync_access";
const MAX_SERVICE_AUTH_SKEW_SECONDS = 5 * 60;

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

function getSyncAccessToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length).trim();

  const queryToken = new URL(request.url).searchParams.get("accessToken");
  if (queryToken) return queryToken;

  return parseCookies(request.headers.get("cookie")).get(COOKIE_NAME) ?? null;
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

async function hashBody(bodyText: string) {
  return bytesToBase64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bodyText)),
  );
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function verifySyncAccess(
  request: Request,
  env: Env,
  roomId: string,
  sessionId?: string | null,
) {
  const accessToken = getSyncAccessToken(request);
  if (!accessToken) return null;

  const [payload, signature] = accessToken.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload, env.SYNC_COOKIE_SECRET);
  if (!timingSafeEqual(expected, signature)) return null;

  let claims: SyncAccessClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as SyncAccessClaims;
  } catch {
    return null;
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
  if (claims.roomId !== roomId) return null;
  if (sessionId && claims.sessionId !== sessionId) return null;
  return claims;
}

export async function verifyServiceRequest(request: Request, env: Env, bodyText: string) {
  const timestamp = request.headers.get("x-drawi-service-timestamp");
  const signature = request.headers.get("x-drawi-service-signature");
  if (!timestamp || !signature) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > MAX_SERVICE_AUTH_SKEW_SECONDS) return false;

  const url = new URL(request.url);
  const payload = [
    request.method.toUpperCase(),
    url.pathname,
    String(timestampSeconds),
    await hashBody(bodyText),
  ].join("\n");
  const expected = await sign(payload, env.SYNC_COOKIE_SECRET);
  return timingSafeEqual(expected, signature);
}
