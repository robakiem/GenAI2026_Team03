import { messageForError } from "../../i18n/errorText";

// Consistent inline error banner mapped to a Ukrainian message (A-15).
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      {messageForError(error)}
    </p>
  );
}
