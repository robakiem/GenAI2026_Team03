import { useState } from "react";
import { uk } from "../i18n/uk";

// The colour themes. The swatch shows the theme itself, so its colours are fixed, not theme variables.
const THEMES = [
  { id: "bloom", background: "#fff6e6", dot: "#e94f7c", meta: "#e94f7c" },
  { id: "clay", background: "#f3ead6", dot: "#7d2f3c", meta: "#7d2f3c" },
  { id: "night", background: "#17142a", dot: "#ff6f91", meta: "#17142a" },
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
    <div role="radiogroup" aria-label={uk.theme.label} className="flex items-center gap-0.5 rounded-full bg-on-accent/20 p-1">
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={theme === item.id}
          title={uk.theme.names[item.id]}
          aria-label={uk.theme.names[item.id]}
          onClick={() => choose(item.id)}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-on-accent ${
            theme === item.id ? "ring-2 ring-on-accent" : "hover:bg-on-accent/30"
          }`}
        >
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
            style={{ backgroundColor: item.background }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.dot }} />
          </span>
        </button>
      ))}
    </div>
  );
}
