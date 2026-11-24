import type { LedgerState } from "@babki/shared";
import { uk } from "../i18n/uk";

const styles: Record<LedgerState, string> = {
  ACTIVE: "bg-leaf-soft text-leaf-deep",
  SETTLING: "bg-sun-soft text-sun-deep",
  CLOSED: "bg-line text-ink-soft",
};

export function StateChip({ state }: { state: LedgerState }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${styles[state]}`}>
      {uk.state[state]}
    </span>
  );
}
