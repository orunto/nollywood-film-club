import type { Route } from "./+types/api.create-username";
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

  const payload = (body ?? {}) as {
    username?: unknown;
    displayName?: unknown;
  };

  if (typeof payload.username !== "string" || !payload.username) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }
  if (!USERNAME_RE.test(payload.username)) {
    return Response.json(
      {
        error:
          "Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens",
      },
      { status: 400 },
    );
  }

  // Usernames are case-insensitively unique, so they are stored lowercased and
  // every comparison agrees. Display name is optional and updates in the same
  // write as the username.
  const displayName =
    typeof payload.displayName === "string" && payload.displayName.trim()
      ? payload.displayName.trim()
      : null;

  const result = await services.db.profiles.setUsername(
    session.userId,
    payload.username,
    displayName,
  );

  switch (result.status) {
    case "ok":
      return Response.json(
        { success: true, username: payload.username.toLowerCase() },
        { status: 201 },
      );
    case "taken":
      return Response.json({ error: "Username is already taken" }, { status: 409 });
    case "user-missing":
      return Response.json({ error: "User not found" }, { status: 404 });
  }
}