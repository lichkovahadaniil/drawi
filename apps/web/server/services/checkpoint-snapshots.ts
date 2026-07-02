import "server-only";
import { createHash, createHmac } from "node:crypto";
import { getServerEnv } from "../env/server";

type CheckpointSnapshotRequest = {
  roomId: string;
  storageKey: string;
};

export async function writeCheckpointSnapshot(request: CheckpointSnapshotRequest) {
  await callSyncWorkerCheckpointEndpoint("/api/checkpoints/export", request);
}

export async function restoreCheckpointSnapshot(request: CheckpointSnapshotRequest) {
  await callSyncWorkerCheckpointEndpoint("/api/checkpoints/restore", request);
}

export function createSyncWorkerServiceSignature({
  method,
  path,
  timestamp,
  body,
  secret,
}: {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  secret: string;
}) {
  const bodyHash = createHash("sha256").update(body).digest("base64url");
  return createHmac("sha256", secret)
    .update([method.toUpperCase(), path, String(timestamp), bodyHash].join("\n"))
    .digest("base64url");
}

async function callSyncWorkerCheckpointEndpoint(
  path: "/api/checkpoints/export" | "/api/checkpoints/restore",
  request: CheckpointSnapshotRequest,
) {
  const env = getServerEnv();
  const url = new URL(path, env.SYNC_WORKER_ORIGIN);
  const body = JSON.stringify(request);
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-drawi-service-timestamp": String(timestamp),
      "x-drawi-service-signature": createSyncWorkerServiceSignature({
        method: "POST",
        path: url.pathname,
        timestamp,
        body,
        secret: env.SYNC_COOKIE_SECRET,
      }),
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Checkpoint snapshot worker request failed (${response.status}): ${detail || response.statusText}`,
    );
  }
}
