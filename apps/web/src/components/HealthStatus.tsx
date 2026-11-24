import { ApiError } from "../api/client";
import { useHealth } from "../api/health";
import { uk } from "../i18n/uk";

export function HealthStatus() {
  const { data, error, isPending } = useHealth();

  let text: string = uk.health.checking;
  let dot = "bg-ink-soft";
  let wrap = "bg-line/60 text-ink-soft";
  if (data) {
    text = uk.health.ok;
    dot = "bg-leaf";
    wrap = "bg-leaf-soft text-leaf-deep";
  } else if (!isPending) {
    const dbDown = error instanceof ApiError && error.code === "DB_UNAVAILABLE";
    text = dbDown ? uk.health.dbUnavailable : uk.health.unreachable;
    dot = "bg-danger";
    wrap = "bg-danger-soft text-danger";
  }

  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${wrap}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}
