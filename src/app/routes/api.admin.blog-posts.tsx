import type { Route } from "./+types/api.admin.blog-posts";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import type { BlogInput } from "../../repositories/admin-blog";

export async function loader({ context, request }: Route.LoaderArgs) { const services = context.get(appServicesContext); const authorization = await requireAdmin(services, request); if (authorization instanceof Response) return authorization; return Response.json({ success: true, data: await services.db.adminBlog.list() }); }
export async function action({ context, request }: Route.ActionArgs) { const services = context.get(appServicesContext); const authorization = await requireAdmin(services, request); if (authorization instanceof Response) return authorization; const post = await services.db.adminBlog.create(parseBlog(await request.json())); return Response.json({ success: true, data: post, message: "Blog post created successfully" }, { status: 201 }); }
export function parseBlog(body: Record<string, unknown>): BlogInput { if (typeof body.title !== "string" || typeof body.content !== "string" || typeof body.slug !== "string") throw new Error("title, content, and slug are required"); return { title: body.title, content: body.content, excerpt: typeof body.excerpt === "string" ? body.excerpt : null, slug: body.slug, published: body.published === true, publishedAt: typeof body.publishedAt === "string" ? body.publishedAt : null }; }
