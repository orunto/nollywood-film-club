import type { Route } from "./+types/api.admin.blog-posts.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { parseBlog } from "./api.admin.blog-posts";

export async function action({ context, params, request }: Route.ActionArgs) { const services = context.get(appServicesContext); const authorization = await requireAdmin(services, request); if (authorization instanceof Response) return authorization; if (request.method === "DELETE") { if (!await services.db.adminBlog.delete(params.id)) return Response.json({ success: false, error: "Blog post not found" }, { status: 404 }); return Response.json({ success: true, message: "Blog post deleted successfully" }); } const post = await services.db.adminBlog.update(params.id, parseBlog(await request.json())); if (!post) return Response.json({ success: false, error: "Blog post not found" }, { status: 404 }); return Response.json({ success: true, data: post, message: "Blog post updated successfully" }); }
