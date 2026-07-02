"use client";

import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  DataURL,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  authorizeBoardAssetUrl,
  createBoardAssetUrl,
  createBoardSyncConnectUrl,
  encodeBoardClientMessage,
  ensureBoardSyncAccess,
  normalizeSyncOrigin,
  parseBoardServerMessage,
  pickSyncedAppState,
  stripBoardAssetAccessToken,
  type ExcalidrawSceneSnapshot,
} from "./sync-client";

const ExcalidrawCanvas = dynamic(
  async () => {
    const excalidrawModule = await import("@excalidraw/excalidraw");
    return excalidrawModule.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[560px] items-center justify-center text-sm font-bold text-[var(--ink-2)]">
        Loading board...
      </div>
    ),
  },
);

type BoardConnectionState = "connecting" | "connected" | "reconnecting" | "unavailable";

const EMPTY_SCENE: ExcalidrawSceneSnapshot = {
  elements: [],
  appState: null,
  files: {},
};
const CAPTURE_UPDATE_NEVER = "NEVER";

export function CollaborativeBoard({
  boardId,
  roomId,
  mode,
}: {
  boardId: string;
  roomId: string;
  mode: "edit" | "view";
}) {
  const syncOrigin = normalizeSyncOrigin(process.env.NEXT_PUBLIC_DRAWI_SYNC_URL);
  const readonly = mode === "view";
  const [connectionState, setConnectionState] = useState<BoardConnectionState>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const suppressLocalChangeRef = useRef(false);
  const latestVersionRef = useRef(0);
  const latestLocalSceneRef = useRef<ExcalidrawSceneSnapshot>(EMPTY_SCENE);
  const localChangeEpochRef = useRef(0);
  const pendingRemoteSceneRef = useRef<ExcalidrawSceneSnapshot | null>(null);
  const uploadedFileUrlsRef = useRef(new Map<string, string>());
  const accessTokenRef = useRef("");

  const initialData = useMemo(
    () => ({
      elements: EMPTY_SCENE.elements,
      appState: EMPTY_SCENE.appState,
      files: EMPTY_SCENE.files,
    }),
    [],
  );

  const applyRemoteScene = useCallback((scene: ExcalidrawSceneSnapshot, version: number) => {
    latestVersionRef.current = version;
    latestLocalSceneRef.current = scene;

    const api = apiRef.current;
    if (!api) {
      pendingRemoteSceneRef.current = scene;
      return;
    }

    suppressLocalChangeRef.current = true;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (apiRef.current !== api) {
          suppressLocalChangeRef.current = false;
          return;
        }

        const sceneForCanvas = authorizeSceneFiles(scene, accessTokenRef.current);
        const files = Object.values(sceneForCanvas.files);
        if (files.length) api.addFiles(files);
        api.updateScene({
          elements: sceneForCanvas.elements,
          appState: sceneForCanvas.appState ?? undefined,
          captureUpdate: CAPTURE_UPDATE_NEVER,
        });
        queueMicrotask(() => {
          suppressLocalChangeRef.current = false;
        });
      });
    });
  }, []);

  const flushLocalScene = useCallback(
    async (expectedEpoch: number) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || readonly) return;

      try {
        const scene = latestLocalSceneRef.current;
        const files = await externalizeFiles(
          scene.files,
          syncOrigin,
          roomId,
          accessTokenRef.current,
          uploadedFileUrlsRef,
        );
        if (expectedEpoch !== localChangeEpochRef.current) {
          return;
        }

        socket.send(
          encodeBoardClientMessage({
            type: "scene-update",
            scene: {
              ...scene,
              files,
            },
          }),
        );
        setLastError(null);
      } catch {
        setLastError("Board changes are not syncing. Check the local sync worker.");
      }
    },
    [readonly, roomId, syncOrigin],
  );

  const handleChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (readonly || suppressLocalChangeRef.current) return;

      localChangeEpochRef.current += 1;
      latestLocalSceneRef.current = {
        elements,
        appState: pickSyncedAppState(appState),
        files,
      };
      const expectedEpoch = localChangeEpochRef.current;
      scheduleSave(saveTimerRef, () => {
        void flushLocalScene(expectedEpoch);
      });
    },
    [flushLocalScene, readonly],
  );

  const handleApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      const pendingScene = pendingRemoteSceneRef.current;
      if (pendingScene) {
        pendingRemoteSceneRef.current = null;
        applyRemoteScene(pendingScene, latestVersionRef.current);
      }
    },
    [applyRemoteScene],
  );

  useEffect(() => {
    let closedByEffect = false;
    let retryCount = 0;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = async () => {
      clearReconnect();
      setConnectionState(retryCount === 0 ? "connecting" : "reconnecting");

      try {
        const access = await ensureBoardSyncAccess(boardId);
        if (closedByEffect) return;

        accessTokenRef.current = access.accessToken;
        const socket = new WebSocket(createBoardSyncConnectUrl(syncOrigin, roomId, access));
        socketRef.current = socket;

        socket.addEventListener("open", () => {
          retryCount = 0;
          setConnectionState("connected");
          setLastError(null);
        });

        socket.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          const message = parseBoardServerMessage(event.data);
          if (!message) return;

          if (message.type === "sync-error") {
            setLastError(message.message);
            return;
          }

          if (message.type === "server-snapshot" || message.type === "scene-update") {
            if (message.version < latestVersionRef.current) return;
            applyRemoteScene(message.scene, message.version);
          }
        });

        socket.addEventListener("close", () => {
          if (socketRef.current === socket) socketRef.current = null;
          if (closedByEffect) return;
          retryCount += 1;
          setConnectionState("reconnecting");
          reconnectTimerRef.current = window.setTimeout(connect, Math.min(5000, retryCount * 800));
        });

        socket.addEventListener("error", () => {
          setLastError("Board connection dropped. Reconnecting...");
        });
      } catch {
        if (closedByEffect) return;
        retryCount += 1;
        setConnectionState(retryCount > 2 ? "unavailable" : "reconnecting");
        setLastError("Collaborative board unavailable. Check your access and sync worker.");
        reconnectTimerRef.current = window.setTimeout(connect, Math.min(5000, retryCount * 900));
      }
    };

    void connect();

    return () => {
      closedByEffect = true;
      const pendingSaveTimer = saveTimerRef.current;
      clearReconnect();
      if (pendingSaveTimer !== null) window.clearTimeout(pendingSaveTimer);
      saveTimerRef.current = null;
      apiRef.current = null;
      accessTokenRef.current = "";
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [applyRemoteScene, boardId, roomId, syncOrigin]);

  const statusLabel =
    connectionState === "connected"
      ? "Synced"
      : connectionState === "connecting"
        ? "Connecting..."
        : connectionState === "reconnecting"
          ? "Reconnecting..."
          : "Offline";

  return (
    <div className="drawi-panel relative min-h-[560px] overflow-hidden bg-[var(--canvas)] p-1">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        {readonly ? <div className="drawi-tag text-xs">Read-only</div> : null}
        <div className="drawi-tag text-xs">{statusLabel}</div>
      </div>
      {lastError ? (
        <div className="absolute right-4 top-4 z-10 max-w-xs rounded-lg border-2 border-[var(--warning)] bg-[var(--canvas)] px-3 py-2 text-xs font-bold leading-5 text-[var(--ink-1)] shadow">
          {lastError}
        </div>
      ) : null}
      <div className="h-[70vh] min-h-[560px] overflow-hidden rounded-[8px] bg-[var(--canvas)]">
        <ExcalidrawCanvas
          excalidrawAPI={handleApi}
          initialData={initialData}
          isCollaborating
          onChange={handleChange}
          viewModeEnabled={readonly}
          zenModeEnabled
          gridModeEnabled
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveAsImage: true,
              export: false,
            },
          }}
        />
      </div>
    </div>
  );
}

function scheduleSave(timerRef: MutableRefObject<number | null>, callback: () => void, ms = 650) {
  if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  timerRef.current = window.setTimeout(callback, ms);
}

async function externalizeFiles(
  files: BinaryFiles,
  syncOrigin: string,
  roomId: string,
  accessToken: string,
  uploadedFileUrlsRef: MutableRefObject<Map<string, string>>,
): Promise<BinaryFiles> {
  const nextFiles: BinaryFiles = { ...files };
  const entries = Object.entries(files) as Array<[string, BinaryFileData]>;

  for (const [fileId, file] of entries) {
    const dataUrl = String(file.dataURL);
    if (!dataUrl.startsWith("data:")) {
      const canonicalUrl = stripBoardAssetAccessToken(dataUrl);
      if (canonicalUrl !== dataUrl) {
        nextFiles[fileId] = { ...file, dataURL: toExcalidrawDataUrl(canonicalUrl) };
      }
      continue;
    }

    const existingUrl = uploadedFileUrlsRef.current.get(fileId);
    if (existingUrl) {
      nextFiles[fileId] = { ...file, dataURL: toExcalidrawDataUrl(existingUrl) };
      continue;
    }

    if (!file.mimeType.startsWith("image/")) continue;

    const objectName = `${fileId}-${file.mimeType.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
    const canonicalUploadUrl = createBoardAssetUrl(syncOrigin, roomId, objectName);
    const authorizedUploadUrl = createBoardAssetUrl(syncOrigin, roomId, objectName, accessToken);
    const blob = await fetch(file.dataURL).then((response) => response.blob());
    const response = await fetch(authorizedUploadUrl, {
      method: "POST",
      headers: {
        "content-type": file.mimeType,
      },
      body: blob,
    });

    if (!response.ok && response.status !== 409) {
      throw new Error("Failed to upload board image.");
    }

    uploadedFileUrlsRef.current.set(fileId, canonicalUploadUrl);
    nextFiles[fileId] = {
      ...file,
      dataURL: toExcalidrawDataUrl(canonicalUploadUrl),
      lastRetrieved: Date.now(),
    };
  }

  return nextFiles;
}

function authorizeSceneFiles(scene: ExcalidrawSceneSnapshot, accessToken: string) {
  const files: BinaryFiles = {};

  for (const [fileId, file] of Object.entries(scene.files) as Array<[string, BinaryFileData]>) {
    const dataUrl = String(file.dataURL);
    const authorizedUrl = authorizeBoardAssetUrl(dataUrl, accessToken);
    files[fileId] =
      authorizedUrl === dataUrl ? file : { ...file, dataURL: toExcalidrawDataUrl(authorizedUrl) };
  }

  return { ...scene, files };
}

function toExcalidrawDataUrl(value: string): DataURL {
  return value as DataURL;
}
