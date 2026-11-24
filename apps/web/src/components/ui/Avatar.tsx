// A member's initial inside a playful shape: flower, arch, cloud or squircle, each in its own colour.
// The shape and colour follow the member's ledger position, so a friend looks the same on every screen.

const SHAPES = [
  // flower (8 round petals)
  "M50 4c9 0 14 7 15 13 5-4 13-6 19 0s4 14 0 19c6 1 13 6 13 15s-7 14-13 15c4 5 6 13 0 19s-14 4-19 0c-1 6-6 13-15 13s-14-7-15-13c-5 4-13 6-19 0s-4-14 0-19C10 65 3 60 3 51s7-14 13-15c-4-5-6-13 0-19s14-4 19 0c1-6 6-13 15-13Z",
  // arch
  "M8 96V48C8 24 27 6 50 6s42 18 42 42v48Z",
  // cloud
  "M28 92C13 92 4 82 4 69c0-10 6-18 15-21-1-3-1-5-1-8 0-17 14-30 31-30 13 0 24 8 29 19 13 1 23 12 23 25 0 4-1 8-3 11 3 4 5 9 5 14 0 9-8 13-17 13Z",
  // squircle
  "M50 4c34 0 46 12 46 46S84 96 50 96 4 84 4 50 16 4 50 4Z",
];

const COLORS = [
  { fill: "var(--color-pink-soft)", stroke: "var(--color-pink)", text: "var(--color-pink-deep)" },
  { fill: "var(--color-sky-soft)", stroke: "var(--color-sky)", text: "var(--color-sky-deep)" },
  { fill: "var(--color-sun-soft)", stroke: "var(--color-sun)", text: "var(--color-sun-deep)" },
  { fill: "var(--color-leaf-soft)", stroke: "var(--color-leaf)", text: "var(--color-leaf-deep)" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return text.toUpperCase() || "?";
}

export function Avatar({ name, position, size = 44 }: { name: string; position: number; size?: number }) {
  const index = Math.max(0, position - 1);
  const shape = SHAPES[index % SHAPES.length];
  const color = COLORS[(index + Math.floor(index / SHAPES.length)) % COLORS.length];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" aria-hidden="true">
      <path d={shape} fill={color.fill} stroke={color.stroke} strokeWidth="5" strokeLinejoin="round" />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        fontSize="34"
        fill={color.text}
      >
        {initials(name)}
      </text>
    </svg>
  );
}
