"use client";

import type { BinaryFiles, AppState } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export const DEFAULT_DRAWI_SYNC_ORIGIN = "http://localhost:8787";
export const BOARD_SYNC_SESSION_ENDPOINT = "/api/board-sync/session-cookie";

export type BoardSyncFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SyncedExcalidrawAppState = Pick<
  AppState,
  | "currentItemBackgroundColor"
  | "currentItemEndArrowhead"
  | "currentItemFillStyle"
  | "currentItemFontFamily"
  | "currentItemFontSize"
  | "currentItemOpacity"
  | "currentItemRoughness"
  | "currentItemStartArrowhead"
  | "currentItemStrokeColor"
  | "currentItemStrokeStyle"
  | "currentItemStrokeWidth"
  | "currentItemTextAlign"
  | "gridSize"
  | "theme"
  | "viewBackgroundColor"
>;

export interface ExcalidrawSceneSnapshot {
  elements: readonly OrderedExcalidrawElement[];
  appState: SyncedExcalidrawAppState | null;
  files: BinaryFiles;
}

export type BoardServerMessage =
  | {
      type: "server-snapshot";
      version: number;
      scene: ExcalidrawSceneSnapshot;
    }
  | {
      type: "scene-update";
      version: number;
      scene: ExcalidrawSceneSnapshot;
      userId: string;
    }
  | {
      type: "sync-error";
      message: string;
    }
  | {
      type: "pong";
    };

export type BoardClientMessage =
  | {
      type: "scene-update";
      scene: ExcalidrawSceneSnapshot;
    }
  | {
      type: "ping";
    };

export function normalizeSyncOrigin(syncOrigin?: string | null) {
  const origin = syncOrigin?.trim() || DEFAULT_DRAWI_SYNC_ORIGIN;
  return origin.replace(/\/+$/, "");
}

export function createBoardSyncConnectUrl(
  syncOrigin: string,
  roomId: string,
  sessionId = crypto.randomUUID(),
) {
  const url = new URL(
    `${normalizeSyncOrigin(syncOrigin)}/api/connect/${encodeURIComponent(roomId)}`,
  );
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
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
  sessionId,
}: {
  boardId: string;
  roomId: string;
  syncOrigin: string;
  fetcher?: BoardSyncFetch;
  sessionId?: string;
}) {
  return async () => {
    await ensureBoardSyncCookie(boardId, fetcher);
    return createBoardSyncConnectUrl(syncOrigin, roomId, sessionId);
  };
}

export function pickSyncedAppState(appState: AppState): SyncedExcalidrawAppState {
  return {
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemEndArrowhead: appState.currentItemEndArrowhead,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemStartArrowhead: appState.currentItemStartArrowhead,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemStrokeStyle: appState.currentItemStrokeStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemTextAlign: appState.currentItemTextAlign,
    gridSize: appState.gridSize,
    theme: appState.theme,
    viewBackgroundColor: appState.viewBackgroundColor,
  };
}

export function encodeBoardClientMessage(message: BoardClientMessage) {
  return JSON.stringify(message);
}

export function parseBoardServerMessage(data: string): BoardServerMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") return null;
  if (parsed.type === "pong") return { type: "pong" };
  if (parsed.type === "sync-error" && typeof parsed.message === "string") {
    return { type: "sync-error", message: parsed.message };
  }
  if (
    (parsed.type === "server-snapshot" || parsed.type === "scene-update") &&
    typeof parsed.version === "number" &&
    isSceneSnapshot(parsed.scene)
  ) {
    if (parsed.type === "scene-update") {
      if (typeof parsed.userId !== "string") return null;
      return {
        type: "scene-update",
        version: parsed.version,
        scene: parsed.scene,
        userId: parsed.userId,
      };
    }

    return {
      type: "server-snapshot",
      version: parsed.version,
      scene: parsed.scene,
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSceneSnapshot(value: unknown): value is ExcalidrawSceneSnapshot {
  if (!isRecord(value)) return false;
  const { elements, appState, files } = value;
  return Array.isArray(elements) && (appState === null || isRecord(appState)) && isRecord(files);
}
