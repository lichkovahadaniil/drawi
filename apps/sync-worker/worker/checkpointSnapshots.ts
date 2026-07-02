import { error, IRequest } from "itty-router";
import { verifyServiceRequest } from "./auth";

interface BoardSceneSnapshot {
  elements: readonly unknown[];
  appState: Record<string, unknown> | null;
  files: Record<string, unknown>;
}

interface StoredCheckpointSnapshot {
  version: number;
  scene: BoardSceneSnapshot;
}

const MAX_CHECKPOINT_BYTES = 8 * 1024 * 1024;

export async function handleCheckpointExport(request: IRequest, env: Env) {
  const bodyText = await request.text();
  if (!(await verifyServiceRequest(request, env, bodyText))) return error(403, "Forbidden");

  const body = parseCheckpointBody(bodyText);
  if (!body) return error(400, "Invalid checkpoint request");

  const snapshotResponse = await getRoomStub(env, body.roomId).fetch(
    createInternalSnapshotUrl(body.roomId),
  );
  if (!snapshotResponse.ok) return error(502, "Could not read board snapshot");

  const snapshotText = await snapshotResponse.text();
  if (new TextEncoder().encode(snapshotText).byteLength > MAX_CHECKPOINT_BYTES) {
    return error(413, "Checkpoint snapshot is too large");
  }

  await env.DRAWI_BOARD_BUCKET.put(body.storageKey, snapshotText, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "private, max-age=31536000, immutable",
    },
  });

  return { ok: true };
}

export async function handleCheckpointRestore(request: IRequest, env: Env) {
  const bodyText = await request.text();
  if (!(await verifyServiceRequest(request, env, bodyText))) return error(403, "Forbidden");

  const body = parseCheckpointBody(bodyText);
  if (!body) return error(400, "Invalid checkpoint request");

  const object = await env.DRAWI_BOARD_BUCKET.get(body.storageKey);
  if (!object) return error(404, "Checkpoint snapshot not found");

  const snapshotText = await object.text();
  const snapshot = parseStoredSnapshot(snapshotText);
  if (!snapshot) return error(422, "Invalid checkpoint snapshot");

  const restoreResponse = await getRoomStub(env, body.roomId).fetch(
    createInternalSnapshotUrl(body.roomId),
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scene: snapshot.scene }),
    },
  );
  if (!restoreResponse.ok) return error(502, "Could not restore board snapshot");

  return { ok: true };
}

function getRoomStub(env: Env, roomId: string) {
  const id = env.DRAWI_BOARD_DURABLE_OBJECT.idFromName(roomId);
  return env.DRAWI_BOARD_DURABLE_OBJECT.get(id);
}

function createInternalSnapshotUrl(roomId: string) {
  return `https://drawi.internal/api/internal/snapshot/${encodeURIComponent(roomId)}`;
}

function parseCheckpointBody(bodyText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const { roomId, storageKey } = parsed;
  if (typeof roomId !== "string" || !roomId.trim()) return null;
  if (typeof storageKey !== "string" || !isCheckpointStorageKey(storageKey)) return null;
  return { roomId, storageKey };
}

function parseStoredSnapshot(bodyText: string): StoredCheckpointSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.version !== "number") return null;
  if (!isSceneSnapshot(parsed.scene)) return null;
  return { version: parsed.version, scene: parsed.scene };
}

function isCheckpointStorageKey(value: string) {
  return (
    value.startsWith("checkpoints/") &&
    value.endsWith(".json") &&
    !value.includes("..") &&
    /^[a-zA-Z0-9/_-]+\.json$/.test(value)
  );
}

function isSceneSnapshot(value: unknown): value is BoardSceneSnapshot {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.elements) &&
    (value.appState === null || isRecord(value.appState)) &&
    isRecord(value.files)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
