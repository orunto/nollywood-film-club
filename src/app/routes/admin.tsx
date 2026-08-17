import type { Route } from "./+types/admin";
import { Link, useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const [users, content, reviews, discussions, reports, contacts, posts] = await Promise.all([
    services.db.adminUsers.list(),
    services.db.adminContent.list(),
    services.db.adminReviews.list(),
    services.db.adminDiscussions.list(),
    services.db.adminReports.list(),
    services.db.contacts.listForAdmin(),
    services.db.adminBlog.list(),
  ]);
  return { user: authorization.session, counts: { users: users.length, content: content.length, reviews: reviews.length, discussions: discussions.length, reports: reports.length, contacts: contacts.length, posts: posts.length } };
}

const sections = [
  ["users", "Users", "/api/admin/users"],
  ["content", "Movies and TV", "/api/admin/movies"],
  ["reviews", "External reviews", "/api/admin/reviews"],
  ["discussions", "Discussions", "/api/admin/discussions"],
  ["reports", "Reports", "/api/admin/reports"],
  ["contacts", "Contact messages", "/api/admin/contact"],
  ["posts", "Blog posts", "/api/admin/blog-posts"],
] as const;

export default function AdminRoute() {
  const { user, counts } = useLoaderData<typeof loader>();
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div><p className="text-xs uppercase tracking-[0.24em] text-black/50">Nollywood Film Club</p><h1 className="mt-2 text-4xl font-semibold">Admin dashboard</h1><p className="mt-2 text-sm text-black/60">Signed in as {user.email}</p></div>
          <Link className="text-sm underline" to="/">Return to site</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map(([key, label, endpoint]) => <Link key={key} to={endpoint} className="rounded-sm border border-black/10 p-5 transition hover:border-black"><p className="text-sm text-black/60">{label}</p><p className="mt-2 text-3xl font-semibold">{counts[key]}</p><p className="mt-4 text-xs uppercase tracking-widest text-black/40">Open API</p></Link>)}
        </div>
      </div>
    </main>
  );
}
