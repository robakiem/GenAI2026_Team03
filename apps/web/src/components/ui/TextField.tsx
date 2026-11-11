import type { InputHTMLAttributes } from "react";

// The look of an input and of its note, shared by TextField and inline fields (the member name),
// so a field error looks and reads the same everywhere.
export function fieldInputClass(error: string | undefined): string {
  return (
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition " +
    "placeholder:text-slate-400 focus:ring-2 " +
    (error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
      : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30")
  );
}

export function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  const note = error ?? hint;
  if (!note) return null;
  return (
    <p id={id} className={`mt-1 text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
      {note}
    </p>
  );
}

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className = "", ...props }: Props) {
  const noteId = `${id}-note`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        className={`mt-1.5 ${fieldInputClass(error)} ${className}`}
        {...props}
      />
      <FieldNote id={noteId} error={error} hint={hint} />
    </div>
  );
}
