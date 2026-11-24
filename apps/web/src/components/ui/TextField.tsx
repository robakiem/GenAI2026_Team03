import type { InputHTMLAttributes } from "react";

// The look of an input and of its note, shared by TextField and inline fields (the member name),
// so a field error looks and reads the same everywhere.
export function fieldInputClass(error: string | undefined): string {
  return (
    "w-full min-w-0 rounded-2xl border-2 bg-paper px-4 py-2.5 text-ink outline-none transition " +
    "placeholder:text-ink-soft/60 focus:ring-4 " +
    (error ? "border-danger/60 focus:border-danger focus:ring-danger/15" : "border-line focus:border-pink focus:ring-pink/15")
  );
}

export function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  const note = error ?? hint;
  if (!note) return null;
  return (
    <p id={id} className={`mt-1 text-xs ${error ? "font-medium text-danger" : "text-ink-soft"}`}>
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
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
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
