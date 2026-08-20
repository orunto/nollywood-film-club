import type { Route } from "./+types/admin";
import { Link, NavLink, Outlet, useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  return { user: authorization.session };
}

const navItems = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/members", label: "Members", end: false },
  { to: "/admin/catalog", label: "Catalog", end: false },
  { to: "/admin/moderation", label: "Moderation", end: false },
  { to: "/admin/publishing", label: "Publishing", end: false },
] as const;

export default function AdminRoute() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-black">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[232px_1fr]">
        <aside className="border-b border-black/10 bg-black px-5 py-6 text-white lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-6">
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
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded px-3 py-2.5 text-sm transition hover:bg-white/10 ${
                    isActive ? "bg-white/12 text-white" : "text-white/60"
                  }`
                }
              >
                {item.label}
              </NavLink>
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
          <Outlet />
        </section>
      </div>
    </main>
  );
}