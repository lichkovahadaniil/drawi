import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const syncClaims = {
  userId: "user-1",
  boardId: "board-1",
  roomId: "room-1",
  permission: "edit" as const,
  sessionId: "session-1",
};

function stubServerEnv() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgres://drawi:drawi@localhost:5432/drawi");
  vi.stubEnv("BETTER_AUTH_SECRET", "better-auth-secret-for-tests");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_LIVEKIT_URL", "ws://localhost:7880");
  vi.stubEnv("LIVEKIT_API_KEY", "devkey");
  vi.stubEnv("LIVEKIT_API_SECRET", "secret");
  vi.stubEnv("NEXT_PUBLIC_DRAWI_SYNC_URL", "http://localhost:8787");
  vi.stubEnv("SYNC_COOKIE_SECRET", "sync-cookie-secret-for-tests");
  vi.stubEnv("SYNC_WORKER_ORIGIN", "http://localhost:8787");
}

async function loadSyncTokenModule() {
  return import("../server/domain/sync-token");
}

describe("sync token helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    stubServerEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates and verifies signed sync cookie claims", async () => {
    const { createSyncCookieValue, verifySyncCookieValue } = await loadSyncTokenModule();

    const value = createSyncCookieValue(syncClaims, 120);
    const verified = verifySyncCookieValue(value);

    expect(verified).toMatchObject(syncClaims);
    expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects malformed, tampered, and expired cookie values", async () => {
    const { createSyncCookieValue, verifySyncCookieValue } = await loadSyncTokenModule();
    const validValue = createSyncCookieValue(syncClaims, 120);
    const [payload, signature] = validValue.split(".");
    if (!payload || !signature) {
      throw new Error("Expected sync cookie to include payload and signature.");
    }

    expect(verifySyncCookieValue("missing-signature")).toBeNull();
    expect(verifySyncCookieValue(`${payload}.short`)).toBeNull();
    expect(verifySyncCookieValue(`${payload.slice(0, -1)}a.${signature}`)).toBeNull();
    expect(verifySyncCookieValue(createSyncCookieValue(syncClaims, -1))).toBeNull();
  });

  it("creates deterministic worker service signatures", async () => {
    const { createSyncWorkerServiceSignature } =
      await import("../server/services/checkpoint-snapshots");

    expect(
      createSyncWorkerServiceSignature({
        method: "post",
        path: "/api/checkpoints/export",
        timestamp: 123,
        body: JSON.stringify({ roomId: "room-1", storageKey: "checkpoints/board-1/one.json" }),
        secret: "sync-cookie-secret-for-tests",
      }),
    ).toBe(
      createSyncWorkerServiceSignature({
        method: "POST",
        path: "/api/checkpoints/export",
        timestamp: 123,
        body: JSON.stringify({ roomId: "room-1", storageKey: "checkpoints/board-1/one.json" }),
        secret: "sync-cookie-secret-for-tests",
      }),
    );
  });
});
