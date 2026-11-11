import { Link } from "react-router";
import { AppShell } from "../components/AppShell";
import { HealthStatus } from "../components/HealthStatus";
import { buttonClass } from "../components/ui/Button";
import { ChevronRightIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";
import { screens } from "../screens";

export function HomePage() {
  return (
    <AppShell>
      <section className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{uk.app.heroTitle}</h1>
        <p className="mt-3 text-slate-600">{uk.app.heroLead}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/signup" className={buttonClass("primary")}>
            {uk.auth.signUpButton}
          </Link>
          <Link to="/signin" className={buttonClass("secondary")}>
            {uk.auth.signInButton}
          </Link>
        </div>
        <div className="mt-4">
          <HealthStatus />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{uk.app.screensTitle}</h2>
        <ul className="mt-3 space-y-2">
          {screens.map(({ key, example }) => (
            <li key={key}>
              <Link
                to={example}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition hover:border-emerald-300"
              >
                <span className="truncate">{uk.screens[key]}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
