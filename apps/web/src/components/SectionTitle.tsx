import type { ReactNode } from "react";

// "Учасники" / "Витрати" with an optional italic accent and a count bubble.
export function SectionTitle({ title, accent, count, action }: { title: string; accent?: string; count?: number; action?: ReactNode }) {
  return (
    <div className="mt-9 flex items-end justify-between gap-3 first:mt-0">
      <h2 className="text-xl font-extrabold md:text-2xl tracking-tight text-ink">
        {title}
        {accent ? <span className="accent text-pink"> {accent}</span> : null}
        {count !== undefined ? (
          <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-pink-soft px-2 align-middle text-xs font-bold text-pink-deep">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}
