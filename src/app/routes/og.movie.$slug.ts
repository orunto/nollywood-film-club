import type { Route } from "./+types/og.movie.$slug";
import { appServicesContext } from "../context";
import { contentOgImage } from "../../services/og-image";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  return contentOgImage(services.db.publicReads, params.slug ?? "", request);
}