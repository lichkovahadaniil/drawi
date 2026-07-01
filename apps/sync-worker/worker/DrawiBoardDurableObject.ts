import { DurableObject } from "cloudflare:workers";
import { AutoRouter, error, IRequest } from "itty-router";

type BoardPermission = "manage" | "edit" | "view";

interface SocketAttachment {
  sessionId: string;
  userId: string;
  permission: BoardPermission;
}

interface BoardSceneSnapshot {
  elements: readonly unknown[];
  appState: Record<string, unknown> | null;
  files: Record<string, unknown>;
}

interface SnapshotRow {
  [key: string]: ArrayBuffer | string | number | null;
  version: number;
  snapshot: string;
}

const EMPTY_SCENE: BoardSceneSnapshot = {
  elements: [],
  appState: null,
  files: {},
};

const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

export class DrawiBoardDurableObject extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS board_snapshots (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL,
          snapshot TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
    });
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    );
  }

  private readonly router = AutoRouter({ catch: (e) => error(e) }).get(
    "/api/connect/:roomId",
    (request) => this.handleConnect(request),
  );

  fetch(request: Request): Response | Promise<Response> {
    return this.router.fetch(request);
  }

  async handleConnect(request: IRequest) {
    const sessionId = request.query.sessionId as string;
    if (!sessionId) return error(400, "Missing sessionId");

    const userId = request.headers.get("x-drawi-user-id");
    const permission = request.headers.get("x-drawi-permission");
    if (!userId || !isBoardPermission(permission)) return error(403, "Forbidden");

    const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair();
    this.ctx.acceptWebSocket(serverWebSocket);
    serverWebSocket.serializeAttachment({
      sessionId,
      userId,
      permission,
    } satisfies SocketAttachment);

    const snapshot = this.readSnapshot();
    serverWebSocket.send(
      JSON.stringify({
        type: "server-snapshot",
        version: snapshot.version,
        scene: snapshot.scene,
      }),
    );

    return new Response(null, { status: 101, webSocket: clientWebSocket });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) {
      ws.close(1008, "Missing session");
      return;
    }

    const parsed = parseClientMessage(message);
    if (!parsed) {
      ws.send(JSON.stringify({ type: "sync-error", message: "Invalid board message." }));
      return;
    }

    if (parsed.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (attachment.permission === "view") {
      ws.send(JSON.stringify({ type: "sync-error", message: "Read-only board access." }));
      return;
    }

    const snapshotJson = JSON.stringify(parsed.scene);
    if (new TextEncoder().encode(snapshotJson).byteLength > MAX_SNAPSHOT_BYTES) {
      ws.send(JSON.stringify({ type: "sync-error", message: "Board snapshot is too large." }));
      return;
    }

    const version = this.saveSnapshot(snapshotJson);
    const broadcastMessage = JSON.stringify({
      type: "scene-update",
      version,
      scene: parsed.scene,
      userId: attachment.userId,
    });

    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws) peer.send(broadcastMessage);
    }
  }

  override async webSocketClose(ws: WebSocket) {
    ws.deserializeAttachment();
  }

  override async webSocketError(ws: WebSocket) {
    ws.deserializeAttachment();
  }

  private readSnapshot(): { version: number; scene: BoardSceneSnapshot } {
    const rows = this.ctx.storage.sql
      .exec<SnapshotRow>("SELECT version, snapshot FROM board_snapshots WHERE id = 1")
      .toArray();
    const [row] = rows;
    if (!row) return { version: 0, scene: EMPTY_SCENE };

    const parsed: unknown = JSON.parse(row.snapshot);
    if (!isSceneSnapshot(parsed)) return { version: row.version, scene: EMPTY_SCENE };
    return { version: row.version, scene: parsed };
  }

  private saveSnapshot(snapshotJson: string) {
    const current = this.readSnapshot();
    const now = Date.now();
    const version = Math.max(current.version + 1, now);
    this.ctx.storage.sql.exec(
      `
        INSERT INTO board_snapshots (id, version, snapshot, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          version = excluded.version,
          snapshot = excluded.snapshot,
          updated_at = excluded.updated_at
      `,
      version,
      snapshotJson,
      now,
    );
    return version;
  }
}

function parseClientMessage(message: string | ArrayBuffer):
  | { type: "ping" }
  | {
      type: "scene-update";
      scene: BoardSceneSnapshot;
    }
  | null {
  const text = typeof message === "string" ? message : new TextDecoder().decode(message);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") return null;
  if (parsed.type === "ping") return { type: "ping" };
  if (parsed.type === "scene-update" && isSceneSnapshot(parsed.scene)) {
    return { type: "scene-update", scene: parsed.scene };
  }
  return null;
}

function isBoardPermission(value: unknown): value is BoardPermission {
  return value === "manage" || value === "edit" || value === "view";
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
