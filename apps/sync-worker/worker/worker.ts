import { handleUnfurlRequest } from "cloudflare-workers-unfurl";
import { AutoRouter, error, IRequest } from "itty-router";
import { handleAssetDownload, handleAssetUpload } from "./assetUploads";
import { verifySyncAccess } from "./auth";

// make sure our sync durable object is made available to cloudflare
export { TldrawDurableObject } from "./TldrawDurableObject";

// we use itty-router (https://itty.dev/) to handle routing. in this example we turn on CORS because
// we're hosting the worker separately to the client. you should restrict this to your own domain.
const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
  catch: (e) => {
    console.error(e);
    return error(e);
  },
})
  // requests to /connect are routed to the Durable Object, and handle realtime websocket syncing
  .get("/api/connect/:roomId", async (request, env) => {
    const roomId = request.params.roomId;
    if (!roomId) return error(400, "Missing room id");
    const claims = await verifySyncAccess(request, env, roomId);
    if (!claims) return error(403, "Forbidden");

    const id = env.TLDRAW_DURABLE_OBJECT.idFromName(roomId);
    const room = env.TLDRAW_DURABLE_OBJECT.get(id);
    const headers = new Headers(request.headers);
    headers.set("x-drawi-user-id", claims.userId);
    headers.set("x-drawi-permission", claims.permission);
    headers.set("x-drawi-board-id", claims.boardId);
    return room.fetch(request.url, { headers, body: request.body });
  })

  // assets can be uploaded to the bucket under /uploads after sync access verification:
  .post("/api/uploads/:roomId/:uploadId", async (request, env) => {
    const roomId = request.params.roomId;
    if (!roomId) return error(400, "Missing room id");
    const claims = await verifySyncAccess(request, env, roomId);
    if (!claims || claims.permission === "view") return error(403, "Forbidden");
    return handleAssetUpload(request, env);
  })

  // they can be retrieved from the bucket too:
  .get("/api/uploads/:roomId/:uploadId", async (request, env, ctx) => {
    const roomId = request.params.roomId;
    if (!roomId) return error(400, "Missing room id");
    const claims = await verifySyncAccess(request, env, roomId);
    if (!claims) return error(403, "Forbidden");
    return handleAssetDownload(request, env, ctx);
  })

  // bookmarks need to extract metadata from pasted URLs:
  .get("/api/unfurl", handleUnfurlRequest)
  .all("*", () => {
    return new Response("Not found", { status: 404 });
  });

export default {
  fetch: router.fetch,
};
