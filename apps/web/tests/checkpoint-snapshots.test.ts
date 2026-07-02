import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const baseEnv = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://drawi:drawi@localhost:5432/drawi",
  BETTER_AUTH_SECRET: "better-auth-secret-for-tests",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_LIVEKIT_URL: "ws://localhost:7880",
  LIVEKIT_API_KEY: "devkey",
  LIVEKIT_API_SECRET: "secret",
  NEXT_PUBLIC_DRAWI_SYNC_URL: "http://localhost:8787",
  SYNC_COOKIE_SECRET: "sync-cookie-secret-for-tests",
  SYNC_WORKER_ORIGIN: "https://sync.example.com/base/",
} as const;

function stubServerEnv() {
  for (const [key, value] of Object.entries(baseEnv)) {
    vi.stubEnv(key, value);
  }
}

async function loadCheckpointSnapshotsModule() {
  return import("../server/services/checkpoint-snapshots");
}

describe("checkpoint snapshot worker client", () => {
  beforeEach(() => {
    vi.resetModules();
    stubServerEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates deterministic worker service signatures independent of method case", async () => {
    const { createSyncWorkerServiceSignature } = await loadCheckpointSnapshotsModule();
    const body = JSON.stringify({ roomId: "room-1", storageKey: "checkpoints/board-1/one.json" });

    expect(
      createSyncWorkerServiceSignature({
        method: "post",
        path: "/api/checkpoints/export",
        timestamp: 123,
        body,
        secret: "sync-cookie-secret-for-tests",
      }),
    ).toBe(
      createSyncWorkerServiceSignature({
        method: "POST",
        path: "/api/checkpoints/export",
        timestamp: 123,
        body,
        secret: "sync-cookie-secret-for-tests",
      }),
    );
  });

  it("signs checkpoint export and restore requests to the sync worker", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    const { writeCheckpointSnapshot, restoreCheckpointSnapshot } =
      await loadCheckpointSnapshotsModule();

    await writeCheckpointSnapshot({
      roomId: "room-1",
      storageKey: "checkpoints/board-1/export.json",
    });
    await restoreCheckpointSnapshot({
      roomId: "room-2",
      storageKey: "checkpoints/board-1/export.json",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toEqual(
      new URL("https://sync.example.com/api/checkpoints/export"),
    );
    expect(fetcher.mock.calls[1]?.[0]).toEqual(
      new URL("https://sync.example.com/api/checkpoints/restore"),
    );

    for (const [, init] of fetcher.mock.calls) {
      expect(init?.method).toBe("POST");
      expect(init?.cache).toBe("no-store");
      expect(init?.headers).toMatchObject({
        "content-type": "application/json",
      });
      expect(
        String((init?.headers as Record<string, string>)["x-drawi-service-signature"] ?? ""),
      ).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(
        Number((init?.headers as Record<string, string>)["x-drawi-service-timestamp"]),
      ).toBeGreaterThan(0);
    }
  });

  it("throws worker response details when checkpoint requests fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad snapshot", { status: 502, statusText: "Bad Gateway" })),
    );
    const { writeCheckpointSnapshot } = await loadCheckpointSnapshotsModule();

    await expect(
      writeCheckpointSnapshot({
        roomId: "room-1",
        storageKey: "checkpoints/board-1/export.json",
      }),
    ).rejects.toThrow("Checkpoint snapshot worker request failed (502): bad snapshot");
  });

  it("falls back to response status text when error bodies cannot be read", async () => {
    const failingResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Error",
      text: vi.fn(async () => {
        throw new Error("stream failed");
      }),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => failingResponse),
    );
    const { restoreCheckpointSnapshot } = await loadCheckpointSnapshotsModule();

    await expect(
      restoreCheckpointSnapshot({
        roomId: "room-1",
        storageKey: "checkpoints/board-1/export.json",
      }),
    ).rejects.toThrow("Checkpoint snapshot worker request failed (500): Internal Error");
  });
});
