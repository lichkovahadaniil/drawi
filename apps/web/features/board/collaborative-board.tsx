"use client";

import { useSync } from "@tldraw/sync";
import { useMemo } from "react";
import { Tldraw, type TLAssetStore, uniqueId } from "tldraw";
import {
  createBoardAssetUrl,
  createBoardSyncUriResolver,
  normalizeSyncOrigin,
} from "./sync-client";

export function CollaborativeBoard({
  boardId,
  roomId,
  mode,
}: {
  boardId: string;
  roomId: string;
  mode: "edit" | "view";
}) {
  const syncOrigin = normalizeSyncOrigin(process.env.NEXT_PUBLIC_TLDRAW_SYNC_URL);
  const assets = useMemo<TLAssetStore>(
    () => createAssetStore(syncOrigin, roomId),
    [syncOrigin, roomId],
  );
  const syncUri = useMemo(
    () => createBoardSyncUriResolver({ boardId, roomId, syncOrigin }),
    [boardId, roomId, syncOrigin],
  );

  const store = useSync({ uri: syncUri, assets });

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[14px] border border-[var(--line-subtle)] bg-white">
      {mode === "view" ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-[var(--paper-0)] px-3 py-1 text-xs font-bold text-[var(--ink-1)] shadow">
          Read-only
        </div>
      ) : null}
      <Tldraw store={store} />
    </div>
  );
}

function createAssetStore(syncOrigin: string, roomId: string): TLAssetStore {
  return {
    async upload(_asset, file) {
      const id = uniqueId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
      const objectName = `${id}-${safeName}`;
      const uploadUrl = createBoardAssetUrl(syncOrigin, roomId, objectName);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: file,
      });
      if (!response.ok) {
        throw new Error("Failed to upload board asset.");
      }
      return { src: uploadUrl };
    },
    resolve(asset) {
      return asset.props.src;
    },
  };
}
