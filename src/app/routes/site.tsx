import type { Route } from "./+types/site";
import { Outlet, useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Nav, { type NavUser } from "../../components/site/nav";
import SetUsernameBanner from "../../components/site/set-username-banner";

// Layout for all public, nav-bearing pages (matches the legacy (site) route
// group). The nav is resolved once here from the request session instead of
// being repeated in every page. Routes that intentionally have no nav (admin,
// auth, onboarding, API handlers) live outside this layout.
export async function loader({ request, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const session = await services.auth.getSession(request);

  const user: NavUser | null = session
    ? {
        displayName: session.name,
        primaryEmail: session.email,
        profileImageUrl: session.profileImageUrl,
        username: session.username,
      }
    : null;

  return { user, isAdmin: session?.role === "admin" };
}

export default function SiteLayout() {
  const { user, isAdmin } = useLoaderData<typeof loader>();

  return (
    <>
      <Nav user={user} isAdmin={isAdmin} />
      {user && !user.username && <SetUsernameBanner />}
      <Outlet />
    </>
  );
}