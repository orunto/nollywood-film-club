import { getNavUser } from "@/lib/server-queries";
import Nav from "./nav";

// Server wrapper: reads the current user once (server-side, cached per request)
// and hands the nav its serialized props, so the client nav no longer performs
// its own getUser() on mount. Rendered from the (site) route-group layout.
export default async function NavServer() {
  const { user, isAdmin } = await getNavUser();
  return <Nav user={user} isAdmin={isAdmin} />;
}
