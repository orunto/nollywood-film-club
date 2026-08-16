import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { appServicesContext } from "../context";

// After any successful sign-in, route by what the database actually says:
// admins go to the admin console, everyone without a username still needs
// onboarding, everyone else lands on the home feed. Role and username are
// server-owned columns (never client-writable), so this redirect cannot be
// steered by browser-writable metadata.
export async function loader({ request, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const session = await services.auth.getSession(request);

  if (!session) {
    throw redirect("/auth");
  }
  if (session.role === "admin") {
    throw redirect("/admin");
  }
  if (!session.username || session.username.trim() === "") {
    throw redirect("/onboarding");
  }
  throw redirect("/");
}