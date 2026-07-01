import { describe, expect, it, vi } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";
import {
  BOARD_SYNC_SESSION_ENDPOINT,
  DEFAULT_DRAWI_SYNC_ORIGIN,
  createBoardAssetUrl,
  createBoardSyncConnectUrl,
  createBoardSyncUriResolver,
  encodeBoardClientMessage,
  ensureBoardSyncCookie,
  normalizeSyncOrigin,
  parseBoardServerMessage,
  pickSyncedAppState,
} from "../features/board/sync-client";
import { SYNC_ACCESS_COOKIE_TTL_SECONDS } from "../server/domain/sync-access";

describe("board sync client", () => {
  it("normalizes the sync worker origin", () => {
    expect(DEFAULT_DRAWI_SYNC_ORIGIN).toBe("http://localhost:8787");
    expect(normalizeSyncOrigin(undefined)).toBe(DEFAULT_DRAWI_SYNC_ORIGIN);
    expect(normalizeSyncOrigin(" https://sync.example.com/// ")).toBe("https://sync.example.com");
  });

  it("creates encoded sync and asset urls", () => {
    expect(createBoardSyncConnectUrl("http://localhost:8787", "room", "session")).toBe(
      "ws://localhost:8787/api/connect/room?sessionId=session",
    );
    expect(createBoardSyncConnectUrl("https://sync.example.com/", "room/one", "session 1")).toBe(
      "wss://sync.example.com/api/connect/room%2Fone?sessionId=session+1",
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
      sessionId: "session 1",
    });

    expect(fetcher).not.toHaveBeenCalled();
    await expect(resolveUri()).resolves.toBe(
      "wss://sync.example.com/api/connect/room%2Fone?sessionId=session+1",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("encodes local scene updates and ignores malformed server messages", () => {
    const scene = { elements: [], appState: null, files: {} };
    const encoded = encodeBoardClientMessage({ type: "scene-update", scene });

    expect(JSON.parse(encoded)).toEqual({ type: "scene-update", scene });
    expect(parseBoardServerMessage("not-json")).toBeNull();
    expect(parseBoardServerMessage(JSON.stringify([]))).toBeNull();
    expect(parseBoardServerMessage(JSON.stringify({ type: 1 }))).toBeNull();
    expect(parseBoardServerMessage(JSON.stringify({ type: "sync-error", message: 1 }))).toBeNull();
    expect(
      parseBoardServerMessage(JSON.stringify({ type: "scene-update", version: 2 })),
    ).toBeNull();
    expect(
      parseBoardServerMessage(
        JSON.stringify({
          type: "server-snapshot",
          version: 2,
          scene: { elements: [], appState: [], files: {} },
        }),
      ),
    ).toBeNull();
    expect(
      parseBoardServerMessage(
        JSON.stringify({
          type: "server-snapshot",
          version: 2,
          scene,
        }),
      ),
    ).toEqual({
      type: "server-snapshot",
      version: 2,
      scene,
    });
  });

  it("parses realtime server update and status messages", () => {
    const scene = { elements: [], appState: null, files: {} };

    expect(parseBoardServerMessage(JSON.stringify({ type: "pong" }))).toEqual({ type: "pong" });
    expect(
      parseBoardServerMessage(JSON.stringify({ type: "sync-error", message: "Read-only" })),
    ).toEqual({
      type: "sync-error",
      message: "Read-only",
    });
    expect(
      parseBoardServerMessage(JSON.stringify({ type: "scene-update", version: 3, scene })),
    ).toBeNull();
    expect(
      parseBoardServerMessage(
        JSON.stringify({ type: "scene-update", version: 3, scene, userId: "user-1" }),
      ),
    ).toEqual({
      type: "scene-update",
      version: 3,
      scene,
      userId: "user-1",
    });
  });

  it("keeps only stable Excalidraw app state in sync payloads", () => {
    const appState = {
      currentItemBackgroundColor: "transparent",
      currentItemEndArrowhead: "arrow",
      currentItemFillStyle: "hachure",
      currentItemFontFamily: 1,
      currentItemFontSize: 20,
      currentItemOpacity: 100,
      currentItemRoughness: 1,
      currentItemStartArrowhead: null,
      currentItemStrokeColor: "#20201d",
      currentItemStrokeStyle: "solid",
      currentItemStrokeWidth: 2,
      currentItemTextAlign: "left",
      gridSize: 20,
      theme: "light",
      viewBackgroundColor: "#fffefa",
      scrollX: 100,
    } as AppState;

    expect(pickSyncedAppState(appState)).toEqual({
      currentItemBackgroundColor: "transparent",
      currentItemEndArrowhead: "arrow",
      currentItemFillStyle: "hachure",
      currentItemFontFamily: 1,
      currentItemFontSize: 20,
      currentItemOpacity: 100,
      currentItemRoughness: 1,
      currentItemStartArrowhead: null,
      currentItemStrokeColor: "#20201d",
      currentItemStrokeStyle: "solid",
      currentItemStrokeWidth: 2,
      currentItemTextAlign: "left",
      gridSize: 20,
      theme: "light",
      viewBackgroundColor: "#fffefa",
    });
  });
});

describe("board sync access policy", () => {
  it("keeps sync cookies alive for a real working session", () => {
    expect(SYNC_ACCESS_COOKIE_TTL_SECONDS).toBe(8 * 60 * 60);
  });
});
