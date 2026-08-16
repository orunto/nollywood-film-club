import type { Route } from "./+types/api.check-username";
import { appServicesContext } from "../context";
import { USERNAME_RE } from "../../lib/username";

export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const session = await services.auth.getSession(request);
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = (body ?? {}) as { username?: unknown; usernames?: unknown };

  // `usernames` (plural) checks a batch — onboarding offers several
  // suggestions at once and one query answers all of them. `username`
  // (singular) is the debounced single check the input makes.
  const batch = Array.isArray(payload.usernames)
    ? payload.usernames.filter((name): name is string => typeof name === "string")
    : null;

  if (!batch && (typeof payload.username !== "string" || !payload.username)) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }

  const username = payload.username as string;

  if (!batch && !USERNAME_RE.test(username)) {
    return Response.json(
      {
        error:
          "Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens",
      },
      { status: 400 },
    );
  }

  if (batch) {
    const results = await Promise.all(
      batch.map(async (name) => ({
        username: name,
        available:
          USERNAME_RE.test(name) &&
          !(await services.db.profiles.isUsernameTaken(name)),
      })),
    );
    return Response.json({ results });
  }

  const available = await services.db.profiles.isUsernameTaken(username);
  return Response.json({
    available: !available,
    message: available ? "Username is already taken" : "Username is available",
  });
}