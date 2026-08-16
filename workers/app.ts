import { createRequestHandler, RouterContextProvider } from "react-router";
import { appServicesContext } from "../src/app/context";
import { createCloudflareServices } from "../src/services/cloudflare";
import { withSecurityHeaders } from "../src/runtime/security-headers";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const context = new RouterContextProvider();
    context.set(appServicesContext, createCloudflareServices(env));
    const response = await requestHandler(request, context);

    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
