import type { ReactNode } from "react";
import NavServer from "@/components/custom/nav-server";
import SetUsernameBanner from "@/components/custom/set-username-banner";
import { getNavUser } from "@/lib/server-queries";

// Route-group layout for all public, nav-bearing pages. The nav is resolved and
// rendered once here (server-side) instead of being repeated in every page.
// Routes that intentionally have no nav (admin, auth, onboarding, handler) live
// outside this group. Route groups don't affect URLs.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  // getNavUser is React cache()d and NavServer calls it too, so this is the
  // same request-scoped lookup rather than a second trip to Hexclave.
  const { user } = await getNavUser();

  return (
    <>
      <NavServer />
      {user && !user.username && <SetUsernameBanner />}
      {children}
    </>
  );
}
