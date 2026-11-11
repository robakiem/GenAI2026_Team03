import { ApiError } from "../api/client";
import { useHealth } from "../api/health";
import { uk } from "../i18n/uk";

export function HealthStatus() {
  const { data, error, isPending } = useHealth();

  let text: string = uk.health.checking;
  let dot = "bg-slate-400";
  let wrap = "bg-slate-100 text-slate-600";
  if (data) {
    text = uk.health.ok;
    dot = "bg-emerald-500";
    wrap = "bg-emerald-50 text-emerald-700";
  } else if (!isPending) {
    const dbDown = error instanceof ApiError && error.code === "DB_UNAVAILABLE";
    text = dbDown ? uk.health.dbUnavailable : uk.health.unreachable;
    dot = "bg-red-500";
    wrap = "bg-red-50 text-red-700";
  }

  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${wrap}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}
