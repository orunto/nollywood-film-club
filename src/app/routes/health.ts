import type { Route } from "./+types/health";
import { appServicesContext } from "../context";

async function runCheck(check: () => Promise<void>) {
  try {
    await check();
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    } as const;
  }
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const [database, objects, session] = await Promise.all([
    runCheck(() => services.db.check()),
    runCheck(() => services.objects.check()),
    services.auth.getSession(request),
  ]);
  const ok = database.ok && objects.ok;

  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      runtime: services.runtime,
      checks: {
        database,
        objects,
        session: { ok: true, authenticated: session !== null },
      },
    },
    { status: ok ? 200 : 503 },
  );
}
