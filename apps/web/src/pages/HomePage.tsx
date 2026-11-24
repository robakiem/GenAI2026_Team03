import { Link } from "react-router";
import { AppShell } from "../components/AppShell";
import { FlowerRow, Sprig } from "../components/decor/Flowers";
import { HealthStatus } from "../components/HealthStatus";
import { buttonClass } from "../components/ui/Button";
import { ChevronRightIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";
import { screens } from "../screens";

export function HomePage() {
  return (
    <AppShell title={uk.app.heroTitle} accent={uk.app.heroAccent}>
      <div className="md:grid md:grid-cols-[3fr_2fr] md:items-start md:gap-12">
        <section>
          <p className="text-lg text-ink md:text-2xl md:leading-relaxed">{uk.app.heroLead}</p>
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
          <Sprig className="mt-10 hidden h-16 w-64 md:block" />
        </section>

        <Sprig className="mx-auto mt-10 h-10 w-40 md:hidden" />

        <section className="mt-6 md:mt-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{uk.app.screensTitle}</h2>
          <ul className="mt-3 space-y-2">
            {screens.map(({ key, example }) => (
              <li key={key}>
                <Link
                  to={example}
                  className="flex items-center justify-between gap-2 rounded-full border-2 border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink transition hover:border-pink-soft"
                >
                  <span className="truncate">{uk.screens[key]}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-pink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <FlowerRow className="mt-10" />
    </AppShell>
  );
}
