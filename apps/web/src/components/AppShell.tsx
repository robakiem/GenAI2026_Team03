import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { Flower, Tulip } from "./decor/Flowers";
import { Logo } from "./Logo";
import { ThemePicker } from "./ThemePicker";

export type HeroTone = "pink" | "sky";

interface Props {
  children: ReactNode;
  headerRight?: ReactNode;
  // A link above the title, e.g. back to the list.
  back?: { to: string; label: string };
  // "Мої" + accent "поїздки": the accent word is set in the italic serif.
  title?: string;
  accent?: string;
  subtitle?: ReactNode;
  tone?: HeroTone;
}

const toneColor: Record<HeroTone, string> = { pink: "var(--color-pink)", sky: "var(--color-sky)" };

// Page frame: a coloured band with a scalloped bottom edge, then a centred, mobile-first column.
export function AppShell({ children, headerRight, back, title, accent, subtitle, tone = "pink" }: Props) {
  const style = { backgroundColor: toneColor[tone], "--scallop-color": toneColor[tone] } as CSSProperties;
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="scallop-bottom text-on-accent" style={style}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Flower className="absolute -right-3 top-12 h-16 w-16 rotate-12 opacity-90" />
          <Flower petal="var(--petal-pink)" center="var(--color-pink)" className="absolute right-14 top-3 h-7 w-7" />
          <Tulip petal="var(--color-sun)" className="absolute -left-2 bottom-0 h-20 w-12 -rotate-12 opacity-90 md:left-[6%] md:h-32 md:w-20" />
          <Flower petal="var(--petal-sun)" center="var(--color-pink)" className="absolute right-[22%] top-20 hidden h-12 w-12 -rotate-12 md:block" />
          <Flower petal="var(--petal-light)" center="var(--color-sky)" className="absolute right-[34%] top-6 hidden h-6 w-6 md:block" />
          <Tulip petal="var(--petal-pink)" className="absolute bottom-0 right-[10%] hidden h-36 w-24 rotate-6 md:block" />
          <Flower petal="var(--petal-leaf)" center="var(--color-sun)" className="absolute left-[38%] top-4 hidden h-8 w-8 rotate-45 lg:block" />
        </div>
        <div className="relative mx-auto max-w-md px-4 pb-7 pt-3 md:max-w-5xl md:px-8 md:pb-14 md:pt-5">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-on-accent/50">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <ThemePicker />
              {headerRight}
            </div>
          </div>
          {back ? (
            <Link
              to={back.to}
              className="mt-4 inline-block rounded-full text-sm md:mt-6 font-medium text-on-accent/85 hover:text-on-accent focus:outline-none focus-visible:ring-4 focus-visible:ring-on-accent/50"
            >
              {back.label}
            </Link>
          ) : null}
          {title ? (
            <h1 className={`${back ? "mt-1" : "mt-5"} break-words pl-6 text-[2rem] font-extrabold leading-tight tracking-tight md:mt-8 md:max-w-[70%] md:pl-0 md:text-6xl`}>
              {title}
              {accent ? <span className="accent"> {accent}</span> : null}
            </h1>
          ) : null}
          {subtitle ? <div className="mt-1 pl-6 text-on-accent/90 md:mt-3 md:pl-0 md:text-lg">{subtitle}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-16 pt-10 md:max-w-5xl md:px-8 md:pt-16">{children}</main>
    </div>
  );
}
