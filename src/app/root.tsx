import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import type { Route } from "./+types/root";
import { Toaster } from "../components/ui/sonner";
import { pageMeta, SITE_TITLE, SITE_DESCRIPTION } from "../lib/meta";
import { shouldNoIndex } from "../lib/seo";
import "./styles.css";

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  });

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <Meta />
        {shouldNoIndex(pathname, search) && <meta name="robots" content="noindex, follow" />}
        <Links />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Unexpected application error";

  return (
    <main className="shell">
      <p className="eyebrow">Nollywood Film Club</p>
      <h1>{message}</h1>
    </main>
  );
}
