import type { AppServices, AuthSession } from "../services/contracts";

export async function requireAdmin(
  services: AppServices,
  request: Request,
): Promise<{ session: AuthSession } | Response> {
  const session = await services.auth.getSession(request);
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
