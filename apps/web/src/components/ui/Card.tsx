import type { ReactNode } from "react";

export type CardTone = "line" | "pink" | "sky" | "leaf" | "sun";

const tones: Record<CardTone, string> = {
  line: "border-line",
  pink: "border-pink-soft",
  sky: "border-sky-soft",
  leaf: "border-leaf-soft",
  sun: "border-sun-soft",
};

export function Card({ children, className = "", tone = "line" }: { children: ReactNode; className?: string; tone?: CardTone }) {
  return <div className={`rounded-[28px] border-2 bg-paper p-5 ${tones[tone]} ${className}`}>{children}</div>;
}
