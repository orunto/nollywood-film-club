import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Nollywood Film Club" },
];

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">New runtime online</p>
      <h1>Nollywood, one film at a time.</h1>
      <p>
        This React Router shell now runs from the same repository as the legacy
        application. Existing routes will move here only after their behavior is
        characterized.
      </p>
    </main>
  );
}
