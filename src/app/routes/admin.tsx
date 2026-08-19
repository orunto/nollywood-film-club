import type { Route } from "./+types/admin";
import { Link, useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  const [users, content, reviews, discussions, reports, contacts, posts] =
    await Promise.all([
      services.db.adminUsers.list(),
      services.db.adminContent.list(),
      services.db.adminReviews.list(),
      services.db.adminDiscussions.list(),
      services.db.adminReports.list(),
      services.db.contacts.listForAdmin(),
      services.db.adminBlog.list(),
    ]);

  return {
    user: authorization.session,
    today: new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date()),
    counts: {
      users: users.length,
      content: content.length,
      reviews: reviews.length,
      discussions: discussions.length,
      reports: reports.length,
      contacts: contacts.length,
      posts: posts.length,
    },
    recentUsers: users.slice(0, 6).map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.primaryEmail,
      role: user.role,
      signedUpAt: user.signedUpAt,
    })),
    recentContent: content.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.contentType,
      movieOfTheWeek: item.isMovieOfTheWeek,
      createdAt: item.createdAt.toISOString(),
    })),
    openReports: reports
      .filter((report) => report.status === "open")
      .slice(0, 5)
      .map((report) => ({
        id: report.id,
        type: report.targetType,
        reason: report.reason,
        contentTitle: report.contentTitle,
        reporterName: report.reporterName,
        createdAt: report.createdAt,
      })),
    recentPosts: posts.slice(0, 5).map((post) => ({
      id: post.id,
      title: post.title,
      published: post.published,
      createdAt: post.createdAt.toISOString(),
    })),
  };
}

const navItems = [
  ["Overview", "#overview"],
  ["Members", "#members"],
  ["Catalog", "#catalog"],
  ["Moderation", "#moderation"],
  ["Publishing", "#publishing"],
] as const;

const statItems = [
  ["users", "Members"],
  ["content", "Catalog titles"],
  ["reviews", "Member reviews"],
  ["discussions", "Discussions"],
  ["posts", "Blog posts"],
] as const;

export default function AdminRoute() {
  const { user, today, counts, recentUsers, recentContent, openReports, recentPosts } =
    useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-black">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[232px_1fr]">
        <aside className="border-b border-black/10 bg-black px-5 py-6 text-white lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-start justify-between lg:block">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                NFC Control Room
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">
                Nollywood Film Club
              </h1>
            </div>
            <span className="mt-1 rounded-full bg-[#e64b7a] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider lg:hidden">
              Admin
            </span>
          </div>

          <nav className="mt-10 grid grid-cols-2 gap-1 lg:block" aria-label="Admin sections">
            {navItems.map(([label, href], index) => (
              <a
                key={href}
                href={href}
                className={`block rounded px-3 py-2.5 text-sm transition hover:bg-white/10 ${
                  index === 0 ? "bg-white/12 text-white" : "text-white/60"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-10 border-t border-white/15 pt-5 text-xs text-white/50">
            <p className="truncate text-white/80">{user.email}</p>
            <p className="mt-1">Administrator access</p>
            <Link className="mt-5 inline-block text-white underline underline-offset-4" to="/">
              View public site
            </Link>
          </div>
        </aside>

        <section className="min-w-0 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          <header id="overview" className="flex flex-wrap items-end justify-between gap-5 border-b border-black/10 pb-7">
            <div>
              <p className="text-sm text-black/50">{today}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Good to see you, {user.name.split(" ")[0] || "admin"}.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">
                Keep the club’s catalog fresh, the conversation healthy, and the
                weekly ritual moving.
              </p>
            </div>
            <span className="rounded-full bg-[#e64b7a] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white">
              Live workspace
            </span>
          </header>

          <div className="grid gap-px overflow-hidden rounded border border-black/10 bg-black/10 sm:grid-cols-3 lg:grid-cols-5" aria-label="Club totals">
            {statItems.map(([key, label]) => (
              <div key={key} className="bg-white px-4 py-5">
                <p className="text-2xl font-semibold tracking-tight">{counts[key]}</p>
                <p className="mt-1 text-xs text-black/50">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.35fr_1fr]">
            <section id="moderation" className="rounded border border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <h3 className="font-semibold">Needs attention</h3>
                  <p className="mt-1 text-xs text-black/50">Open reports waiting for review</p>
                </div>
                <span className="rounded-full bg-[#fff0f3] px-2.5 py-1 text-xs font-semibold text-[#b52d58]">
                  {openReports.length} open
                </span>
              </div>
              {openReports.length > 0 ? (
                <div className="divide-y divide-black/10">
                  {openReports.map((report) => (
                    <div key={report.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {report.reason}
                          </p>
                          <p className="mt-1 truncate text-xs text-black/50">
                            {report.type} · {report.contentTitle || "Unlinked content"} · reported by {report.reporterName}
                          </p>
                        </div>
                        <time className="shrink-0 text-xs text-black/40" dateTime={report.createdAt}>
                          {formatDate(report.createdAt)}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-black/50">No open reports. The club is clear.</p>
              )}
            </section>

            <section id="publishing" className="rounded border border-black/10 bg-white">
              <div className="border-b border-black/10 px-5 py-4">
                <h3 className="font-semibold">Publishing queue</h3>
                <p className="mt-1 text-xs text-black/50">Recent blog activity</p>
              </div>
              <div className="divide-y divide-black/10">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <p className="truncate text-sm">{post.title}</p>
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${post.published ? "text-emerald-700" : "text-black/40"}`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </div>
                ))}
                {recentPosts.length === 0 && <p className="px-5 py-8 text-sm text-black/50">No posts yet.</p>}
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <section id="members" className="rounded border border-black/10 bg-white">
              <div className="border-b border-black/10 px-5 py-4">
                <h3 className="font-semibold">Recent members</h3>
                <p className="mt-1 text-xs text-black/50">Latest accounts to join the club</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-black/10 text-xs text-black/45">
                    <tr><th className="px-5 py-3 font-medium">Member</th><th className="px-5 py-3 font-medium">Access</th><th className="px-5 py-3 font-medium">Joined</th></tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    {recentUsers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-5 py-3"><p className="font-medium">{member.name}</p><p className="mt-0.5 text-xs text-black/45">{member.email}</p></td>
                        <td className="px-5 py-3 text-xs uppercase tracking-wide text-black/50">{member.role}</td>
                        <td className="px-5 py-3 text-xs text-black/50">{formatDate(member.signedUpAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="catalog" className="rounded border border-black/10 bg-white">
              <div className="border-b border-black/10 px-5 py-4">
                <h3 className="font-semibold">Catalog pulse</h3>
                <p className="mt-1 text-xs text-black/50">Recently added titles</p>
              </div>
              <div className="divide-y divide-black/10">
                {recentContent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs capitalize text-black/45">{item.type.replace("_", " ")} · {formatDate(item.createdAt)}</p></div>
                    {item.movieOfTheWeek && <span className="shrink-0 rounded-full bg-[#fff0f3] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#b52d58]">MOTW</span>}
                  </div>
                ))}
                {recentContent.length === 0 && <p className="px-5 py-8 text-sm text-black/50">No catalog titles yet.</p>}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
