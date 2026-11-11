import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "./Logo";

// Page frame: a sticky top bar with the wordmark plus a centred, mobile-first column.
export function AppShell({ children, headerRight }: { children: ReactNode; headerRight?: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <Logo />
          </Link>
          {headerRight}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
