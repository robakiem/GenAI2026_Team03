import { Link } from "react-router";
import { AppShell } from "../components/AppShell";
import { buttonClass } from "../components/ui/Button";
import { uk, type ScreenKey } from "../i18n/uk";

export function PlaceholderPage({ screen }: { screen: ScreenKey }) {
  return (
    <AppShell>
      <div className="py-14 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{uk.screens[screen]}</h1>
        {screen === "linkNotFound" ? null : <p className="mt-2 text-slate-500">{uk.common.soon}</p>}
        <Link to="/" className={buttonClass("secondary", "mt-6")}>
          {uk.app.home}
        </Link>
      </div>
    </AppShell>
  );
}
