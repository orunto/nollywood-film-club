import type { Route } from "./+types/media";
import { appServicesContext } from "../context";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const key = params["*"];
  if (!key || key.includes("..") || key.includes("\\")) {
    return new Response("Invalid media key", { status: 400 });
  }

  const object = await context.get(appServicesContext).objects.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  if (object.contentType) headers.set("Content-Type", object.contentType);
  if (object.contentLength !== null) {
    headers.set("Content-Length", String(object.contentLength));
  }
  if (object.etag) headers.set("ETag", object.etag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (request.method === "HEAD") return new Response(null, { headers });
  return new Response(object.body, { headers });
}
