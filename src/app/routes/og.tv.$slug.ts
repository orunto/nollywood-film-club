import type { Route } from "./+types/og.tv.$slug";
import { appServicesContext } from "../context";
import { contentOgImage } from "../../services/og-image";

export async function loader({ params, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  return contentOgImage(
    services.db.publicReads,
    services.objects,
    services.images,
    params.slug ?? "",
  );
}
