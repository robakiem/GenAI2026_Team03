import { useHealth } from "../api/health";
import { ApiError } from "../api/client";
import { uk } from "../i18n/uk";

export function HealthStatus() {
  const { data, error, isPending } = useHealth();

  let text: string = uk.health.checking;
  let tone = "text-slate-500";
  if (data) {
    text = uk.health.ok;
    tone = "text-green-700";
  } else if (!isPending) {
    const dbDown = error instanceof ApiError && error.code === "DB_UNAVAILABLE";
    text = dbDown ? uk.health.dbUnavailable : uk.health.unreachable;
    tone = "text-red-700";
  }

  return (
    <p role="status" className={`text-sm font-medium ${tone}`}>
      {text}
    </p>
  );
}
