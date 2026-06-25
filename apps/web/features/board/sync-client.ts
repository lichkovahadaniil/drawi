"use client";

export const DEFAULT_TLDRAW_SYNC_ORIGIN = "http://localhost:8787";
export const BOARD_SYNC_SESSION_ENDPOINT = "/api/board-sync/session-cookie";

type BoardSyncFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function normalizeSyncOrigin(syncOrigin?: string | null) {
  const origin = syncOrigin?.trim() || DEFAULT_TLDRAW_SYNC_ORIGIN;
  return origin.replace(/\/+$/, "");
}

export function createBoardSyncConnectUrl(syncOrigin: string, roomId: string) {
  return `${normalizeSyncOrigin(syncOrigin)}/api/connect/${encodeURIComponent(roomId)}`;
}

export function createBoardAssetUrl(syncOrigin: string, roomId: string, objectName: string) {
  return `${normalizeSyncOrigin(syncOrigin)}/api/uploads/${encodeURIComponent(roomId)}/${encodeURIComponent(objectName)}`;
}

export async function ensureBoardSyncCookie(
  boardId: string,
  fetcher: BoardSyncFetch = globalThis.fetch,
) {
  const response = await fetcher(BOARD_SYNC_SESSION_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ boardId }),
  });

  if (!response.ok) {
    throw new Error("Collaborative session unavailable.");
  }
}

export function createBoardSyncUriResolver({
  boardId,
  roomId,
  syncOrigin,
  fetcher,
}: {
  boardId: string;
  roomId: string;
  syncOrigin: string;
  fetcher?: BoardSyncFetch;
}) {
  const connectUrl = createBoardSyncConnectUrl(syncOrigin, roomId);

  return async () => {
    await ensureBoardSyncCookie(boardId, fetcher);
    return connectUrl;
  };
}
