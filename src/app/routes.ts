import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("health", "routes/health.ts"),
  route("api/auth/*", "routes/api.auth.ts"),
] satisfies RouteConfig;
