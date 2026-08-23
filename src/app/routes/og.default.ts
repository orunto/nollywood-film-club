import type { Route } from "./+types/og.default";
import { appServicesContext } from "../context";
import { defaultOgImage } from "../../services/og-image";

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  return defaultOgImage(services.objects, services.images);
}
