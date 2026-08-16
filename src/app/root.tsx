import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./styles.css";

export const meta: Route.MetaFunction = () => [
  { title: "Nollywood Film Club" },
  {
    name: "description",
    content: "Discover, watch, rate, and discuss Nollywood films.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
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
