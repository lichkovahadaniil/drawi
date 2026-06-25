import { describe, expect, it, vi } from "vitest";
import {
  BOARD_SYNC_SESSION_ENDPOINT,
  createBoardAssetUrl,
  createBoardSyncConnectUrl,
  createBoardSyncUriResolver,
  ensureBoardSyncCookie,
  normalizeSyncOrigin,
} from "../features/board/sync-client";
import { SYNC_ACCESS_COOKIE_TTL_SECONDS } from "../server/domain/sync-access";

describe("board sync client", () => {
  it("normalizes the sync worker origin", () => {
    expect(normalizeSyncOrigin(undefined)).toBe("http://localhost:8787");
    expect(normalizeSyncOrigin(" https://sync.example.com/// ")).toBe("https://sync.example.com");
  });

  it("creates encoded sync and asset urls", () => {
    expect(createBoardSyncConnectUrl("https://sync.example.com/", "room/one")).toBe(
      "https://sync.example.com/api/connect/room%2Fone",
    );
    expect(createBoardAssetUrl("https://sync.example.com/", "room/one", "image 1.png")).toBe(
      "https://sync.example.com/api/uploads/room%2Fone/image%201.png",
    );
  });

  it("requests a short-lived access cookie before opening the websocket", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await ensureBoardSyncCookie("board-1", fetcher);

    expect(fetcher).toHaveBeenCalledWith(BOARD_SYNC_SESSION_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId: "board-1" }),
    });
  });

  it("fails the connection when the session cookie cannot be issued", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 403 }));

    await expect(ensureBoardSyncCookie("board-1", fetcher)).rejects.toThrow(
      "Collaborative session unavailable.",
    );
  });

  it("keeps the websocket uri resolver stable and side-effect free until connection time", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const resolveUri = createBoardSyncUriResolver({
      boardId: "board-1",
      roomId: "room/one",
      syncOrigin: "https://sync.example.com/",
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    await expect(resolveUri()).resolves.toBe("https://sync.example.com/api/connect/room%2Fone");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("board sync access policy", () => {
  it("keeps sync cookies alive for a real working session", () => {
    expect(SYNC_ACCESS_COOKIE_TTL_SECONDS).toBe(8 * 60 * 60);
  });
});
