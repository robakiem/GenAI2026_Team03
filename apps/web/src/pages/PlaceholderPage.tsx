import { Link } from "react-router";
import { AppShell } from "../components/AppShell";
import { FlowerRow } from "../components/decor/Flowers";
import { buttonClass } from "../components/ui/Button";
import { uk, type ScreenKey } from "../i18n/uk";

export function PlaceholderPage({ screen }: { screen: ScreenKey }) {
  return (
    <AppShell title={uk.screens[screen]}>
      <div className="py-6 text-center">
        <FlowerRow />
        {screen === "linkNotFound" ? null : <p className="mt-4 text-ink-soft">{uk.common.soon}</p>}
        <Link to="/" className={buttonClass("secondary", "mt-6")}>
          {uk.app.home}
        </Link>
      </div>
    </AppShell>
  );
}
