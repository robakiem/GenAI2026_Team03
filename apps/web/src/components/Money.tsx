import { formatKopecks } from "@babki/shared";
import { uk } from "../i18n/uk";

// An amount as "362.13 ₴"; `signed` adds "+" to positive balances.
export function Money({ kopecks, signed = false, className = "" }: { kopecks: number; signed?: boolean; className?: string }) {
  const text = formatKopecks(kopecks);
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {signed && kopecks > 0 ? "+" : ""}
      {text.replace("-", "−")} {uk.common.currency}
    </span>
  );
}
