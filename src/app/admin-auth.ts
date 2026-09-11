import type { AppServices, AuthSession } from "../services/contracts";

const sessionCache = new WeakMap<Request, AuthSession | null>();

export async function requireAdmin(
  services: AppServices,
  request: Request,
): Promise<{ session: AuthSession } | Response> {
  let session: AuthSession | null | undefined = sessionCache.get(request);
  if (session === undefined) {
    session = await services.auth.getSession(request);
    sessionCache.set(request, session);
  }
  if (!session) {
    return Response.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  if (session.role !== "admin") {
    return Response.json(
      {
        success: false,
        error: "Admin access required",
        redirectTo: "/user-dashboard",
      },
      { status: 403 },
    );
  }
  return { session };
}
