import { uk } from "../i18n/uk";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white">
        ₴
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">{uk.app.name}</span>
    </span>
  );
}
