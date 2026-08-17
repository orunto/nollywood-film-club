import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("health", "routes/health.ts"),
  route("auth", "routes/auth.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password/:token", "routes/reset-password.tsx"),
  route("api/auth/*", "routes/api.auth.ts"),
  route("api/check-username", "routes/api.check-username.ts"),
  route("api/create-username", "routes/api.create-username.ts"),
  route("api/contact", "routes/api.contact.ts"),
  layout("routes/site.tsx", [
    index("routes/home.tsx"),
    route("movies-and-tv", "routes/movies-and-tv.tsx"),
    route("scoreboard", "routes/scoreboard.tsx"),
    route("discussions", "routes/discussions.tsx"),
    route("about", "routes/about.tsx"),
    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
    route("contact", "routes/contact.tsx"),
  ]),
] satisfies RouteConfig;
