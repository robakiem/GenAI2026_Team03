import { messageForError } from "../../i18n/errorText";

// Consistent inline error banner mapped to a Ukrainian message (A-15).
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-2xl border-2 border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger">
      {messageForError(error)}
    </p>
  );
}
