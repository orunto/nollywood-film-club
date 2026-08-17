import type { Route } from "./+types/api.admin.upload-image";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function action({ context, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File)) return Response.json({ success: false, error: "An image file is required" }, { status: 400 });
  if (!TYPES.has(value.type)) return Response.json({ success: false, error: "Unsupported image type" }, { status: 400 });
  if (value.size > MAX_BYTES) return Response.json({ success: false, error: "Image exceeds the 10 MB limit" }, { status: 413 });
  const id = crypto.randomUUID();
  const extension = EXTENSIONS[value.type];
  const objectKey = `media/uploads/${id}.${extension}`;
  const bytes = await value.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  await services.objects.put(objectKey, value, { contentType: value.type, contentLength: value.size, cacheControl: "public, max-age=31536000, immutable" });
  const media = await services.db.media.create({ objectKey, publicId: id, version: 1, mimeType: value.type, byteSize: value.size, checksum });
  return Response.json({ success: true, data: { id: media.id, objectKey, url: `/media/${objectKey}` } }, { status: 201 });
}
