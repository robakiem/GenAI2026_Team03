import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className = "", ...props }: Props) {
  const note = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={
          "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none " +
          "transition placeholder:text-slate-400 focus:ring-2 " +
          (error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/30 "
            : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30 ") +
          className
        }
        {...props}
      />
      {note ? (
        <p id={`${id}-note`} className={`mt-1 text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
