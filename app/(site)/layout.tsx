import type { ReactNode } from "react";
import NavServer from "@/components/custom/nav-server";

// Route-group layout for all public, nav-bearing pages. The nav is resolved and
// rendered once here (server-side) instead of being repeated in every page.
// Routes that intentionally have no nav (admin, auth, onboarding, handler) live
// outside this group. Route groups don't affect URLs.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavServer />
      {children}
    </>
  );
}
