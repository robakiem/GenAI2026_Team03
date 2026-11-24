import { uk } from "../i18n/uk";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-paper text-lg font-extrabold text-pink shadow-[0_3px_0_0_rgba(0,0,0,0.12)]">
        ₴
      </span>
      <span className="text-xl font-extrabold tracking-tight text-on-accent">
        {uk.app.name}
      </span>
    </span>
  );
}
