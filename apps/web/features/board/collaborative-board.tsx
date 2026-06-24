"use client";

import { useSync } from "@tldraw/sync";
import { useMemo } from "react";
import { Tldraw, type TLAssetStore, uniqueId } from "tldraw";

export function CollaborativeBoard({
  boardId,
  roomId,
  mode,
}: {
  boardId: string;
  roomId: string;
  mode: "edit" | "view";
}) {
  const syncOrigin = process.env.NEXT_PUBLIC_TLDRAW_SYNC_URL ?? "http://localhost:8787";
  const assets = useMemo<TLAssetStore>(
    () => createAssetStore(syncOrigin, roomId),
    [syncOrigin, roomId],
  );

  const store = useSync({
    uri: async () => {
      const response = await fetch("/api/board-sync/session-cookie", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId }),
      });

      if (!response.ok) {
        throw new Error("Collaborative session unavailable.");
      }

      return `${syncOrigin}/api/connect/${roomId}`;
    },
    assets,
  });

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
      const response = await fetch(`${syncOrigin}/api/uploads/${roomId}/${objectName}`, {
        method: "POST",
        body: file,
      });
      if (!response.ok) {
        throw new Error("Failed to upload board asset.");
      }
      return { src: `${syncOrigin}/api/uploads/${roomId}/${objectName}` };
    },
    resolve(asset) {
      return asset.props.src;
    },
  };
}
