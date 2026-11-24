import type { SVGProps } from "react";

// Hand-drawn-style decorations (pure SVG, no images). Always aria-hidden: they carry no meaning.

type Props = SVGProps<SVGSVGElement> & { petal?: string; center?: string };

export function Flower({ petal = "var(--petal-light)", center = "var(--color-sun)", ...props }: Props) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="24" cy="12" rx="8" ry="11" fill={petal} transform={`rotate(${angle} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="6.5" fill={center} />
    </svg>
  );
}

export function Tulip({ petal = "var(--color-pink)", ...props }: Props) {
  return (
    <svg viewBox="0 0 48 80" aria-hidden="true" {...props}>
      <path d="M24 34 C 23 52, 25 64, 23 80" stroke="var(--color-leaf)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M24 60 C 12 54, 8 46, 6 38 C 16 40, 22 48, 24 60 Z" fill="var(--color-leaf)" />
      <path
        d="M10 10 L 17 18 L 24 6 L 31 18 L 38 10 C 40 24, 34 36, 24 36 C 14 36, 8 24, 10 10 Z"
        fill={petal}
      />
    </svg>
  );
}

export function Sprig(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 40" aria-hidden="true" {...props}>
      <path d="M4 30 C 40 10, 80 34, 116 12" stroke="var(--color-leaf)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="34" cy="16" rx="12" ry="5" fill="var(--color-leaf)" transform="rotate(-30 34 16)" />
      <ellipse cx="70" cy="30" rx="12" ry="5" fill="var(--color-leaf)" transform="rotate(25 70 30)" />
      <circle cx="98" cy="14" r="5" fill="var(--color-sun)" />
      <circle cx="20" cy="30" r="4" fill="var(--color-pink)" />
    </svg>
  );
}

// A row of little flowers used as a divider and in empty states.
export function FlowerRow({ className = "" }: { className?: string }) {
  const colors = [
    ["var(--color-sun)", "var(--color-pink)"],
    ["var(--petal-pink)", "var(--color-pink)"],
    ["var(--color-pink)", "var(--petal-light)"],
    ["var(--petal-sky)", "var(--color-sky)"],
    ["var(--color-sun)", "var(--color-leaf)"],
  ];
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`} aria-hidden="true">
      {colors.map(([petal, center], i) => (
        <Flower key={i} petal={petal} center={center} className={i % 2 ? "h-5 w-5" : "h-7 w-7"} />
      ))}
    </div>
  );
}
