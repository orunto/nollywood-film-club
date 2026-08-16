import type { Route } from "./+types/api.auth";
import { appServicesContext } from "../context";

export async function loader({ request, context }: Route.LoaderArgs) {
  return context
    .get(appServicesContext)
    .auth.handler(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  return context
    .get(appServicesContext)
    .auth.handler(request);
}