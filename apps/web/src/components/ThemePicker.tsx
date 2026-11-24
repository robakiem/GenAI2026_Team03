import { useState } from "react";
import { uk } from "../i18n/uk";

// The colour themes. The swatch shows the theme itself, so its colours are fixed, not theme variables.
const THEMES = [
  { id: "bloom", swatch: ["#e94f7c", "#fff6e6"], meta: "#e94f7c" },
  { id: "clay", swatch: ["#7d2f3c", "#7a9a6c"], meta: "#7d2f3c" },
  { id: "night", swatch: ["#17142a", "#ff6f91"], meta: "#17142a" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "babki-theme";

function currentTheme(): ThemeId {
  const value = document.documentElement.dataset.theme;
  return THEMES.some((theme) => theme.id === value) ? (value as ThemeId) : "bloom";
}

// Put the theme on <html> (the CSS variables follow it) and remember it in this browser only.
function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  if (id === "bloom") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
  const meta = THEMES.find((item) => item.id === id)?.meta;
  if (meta) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", meta);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the theme still applies until the page is reloaded.
  }
}

// Switches the colour theme of the whole app.
export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(currentTheme);

  function choose(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
  }

  return (
    <div role="radiogroup" aria-label={uk.theme.label} className="flex items-center gap-1.5">
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={theme === item.id}
          title={uk.theme.names[item.id]}
          aria-label={uk.theme.names[item.id]}
          onClick={() => choose(item.id)}
          className={`h-6 w-6 rounded-full border-2 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-on-accent/50 ${
            theme === item.id ? "scale-110 border-on-accent" : "border-on-accent/40 hover:border-on-accent/80"
          }`}
          style={{ background: `linear-gradient(135deg, ${item.swatch[0]} 50%, ${item.swatch[1]} 50%)` }}
        />
      ))}
    </div>
  );
}
