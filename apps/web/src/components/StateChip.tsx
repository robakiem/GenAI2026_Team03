import type { LedgerState } from "@babki/shared";
import { uk } from "../i18n/uk";

const styles: Record<LedgerState, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  SETTLING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StateChip({ state }: { state: LedgerState }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[state]}`}>
      {uk.state[state]}
    </span>
  );
}
