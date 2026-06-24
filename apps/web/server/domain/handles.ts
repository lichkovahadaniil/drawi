export const reservedHandles = new Set([
  "app",
  "api",
  "admin",
  "analytics",
  "auth",
  "boards",
  "calendar",
  "explore",
  "help",
  "join",
  "marketplace",
  "messages",
  "notifications",
  "pricing",
  "recordings",
  "search",
  "settings",
  "sign-in",
  "sign-up",
  "teams",
  "u",
]);

export function normalizeHandle(handle: string) {
  return handle.trim().toLowerCase();
}

export function validateHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (normalized.length < 3 || normalized.length > 32) {
    return { ok: false as const, reason: "Handle must be 3-32 characters." };
  }
  if (!/^[a-z0-9_][a-z0-9_-]*$/.test(normalized)) {
    return { ok: false as const, reason: "Use letters, numbers, underscore, or hyphen." };
  }
  if (reservedHandles.has(normalized)) {
    return { ok: false as const, reason: "This handle is reserved." };
  }
  return { ok: true as const, normalized };
}
