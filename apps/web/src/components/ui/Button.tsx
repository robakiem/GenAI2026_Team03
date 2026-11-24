import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "sky";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition " +
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-pink/30 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-pink text-on-accent shadow-[0_3px_0_0_var(--color-pink-deep)] hover:bg-pink-deep active:translate-y-0.5 active:shadow-none",
  sky: "bg-sky text-on-accent shadow-[0_3px_0_0_var(--color-sky-deep)] hover:bg-sky-deep active:translate-y-0.5 active:shadow-none",
  secondary: "border-2 border-pink bg-paper text-pink-deep hover:bg-pink-soft/50",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
};

// Shared so a <Link> can look like a button without duplicating the styles.
export function buttonClass(variant: ButtonVariant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
