import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("health", "routes/health.ts"),
  route("auth", "routes/auth.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password/:token", "routes/reset-password.tsx"),
  route("api/auth/*", "routes/api.auth.ts"),
  route("api/check-username", "routes/api.check-username.ts"),
  route("api/create-username", "routes/api.create-username.ts"),
] satisfies RouteConfig;
