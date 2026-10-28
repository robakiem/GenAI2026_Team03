import { Link } from "react-router";
import { HealthStatus } from "../components/HealthStatus";
import { uk } from "../i18n/uk";
import { screens } from "../screens";

export function HomePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-3xl font-bold">{uk.app.name}</h1>
      <p className="mt-2 text-slate-700">{uk.app.tagline}</p>
      <div className="mt-4">
        <HealthStatus />
      </div>
      <h2 className="mt-8 text-lg font-semibold">{uk.app.screensTitle}</h2>
      <ul className="mt-2 space-y-2">
        {screens.map(({ key, example }) => (
          <li key={key}>
            <Link to={example} className="text-blue-700 underline break-words">
              {uk.screens[key]}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
