import { Link } from "react-router";
import { uk, type ScreenKey } from "../i18n/uk";

export function PlaceholderPage({ screen }: { screen: ScreenKey }) {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold break-words">{uk.screens[screen]}</h1>
      <Link to="/" className="mt-4 inline-block text-blue-700 underline">
        {uk.app.home}
      </Link>
    </main>
  );
}
