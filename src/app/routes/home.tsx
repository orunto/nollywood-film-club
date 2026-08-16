import type { Route } from "./+types/home";
import { appServicesContext } from "../context";
import { getHomepageData } from "../../services/homepage";

export const meta: Route.MetaFunction = () => [
  { title: "Nollywood Film Club" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  return getHomepageData(services.db.publicReads);
}

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
