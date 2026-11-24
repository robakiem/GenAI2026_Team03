import { useState, type FormEvent } from "react";
import { LIMITS, paymentDetailsSchema, type Member } from "@babki/shared";
import { useSetPaymentDetails } from "../api/expenses";
import { uk } from "../i18n/uk";
import { useCopy } from "./useCopy";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { FormError } from "./ui/FormError";
import { CheckIcon, CopyIcon } from "./ui/icons";
import { FieldNote, fieldInputClass } from "./ui/TextField";
import { useFieldErrors } from "./useFieldErrors";

const limits = { paymentDetails: LIMITS.paymentDetails };

// One member of a ledger: the personal link to share (US-007) and the payment details the
// Coordinator keeps for them (US-050, EP-10).
export function MemberRow({ member, ledgerId }: { member: Member; ledgerId: string }) {
  const url = `${window.location.origin}/l/${member.linkToken}`;
  const { copied, copy } = useCopy();
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(member.paymentDetails ?? "");
  const save = useSetPaymentDetails(ledgerId, member.id);
  const { errors, validate, bannerError } = useFieldErrors(limits, save.error);
  const noteId = `details-${member.id}-note`;

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const body = validate(paymentDetailsSchema, { paymentDetails: details });
    if (!body) return;
    save.mutate(body.paymentDetails, { onSuccess: () => setEditing(false) });
  }

  return (
    <li className="py-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} position={member.position} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-base font-bold text-ink">{member.name}</span>
            {member.isCoordinator ? (
              <span className="shrink-0 rounded-full bg-pink-soft px-2 py-0.5 text-[11px] font-semibold text-pink-deep">
                {uk.ledger.coordinatorBadge}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setDetails(member.paymentDetails ?? "");
              setEditing((open) => !open);
            }}
            className="mt-0.5 block max-w-full truncate text-left text-xs text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink"
            aria-expanded={editing}
          >
            {member.paymentDetails ?? uk.paymentDetails.none}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copy(url)}
          title={url}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-sky-soft px-3 py-1 text-xs font-semibold text-sky-deep transition hover:bg-sky-soft"
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? uk.ledger.copied : uk.ledger.copyLink}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-3 rounded-2xl bg-cream p-3" noValidate>
          <label htmlFor={`details-${member.id}`} className="text-xs font-semibold text-ink">
            {uk.paymentDetails.label(member.name)}
          </label>
          <input
            id={`details-${member.id}`}
            value={details}
            maxLength={LIMITS.paymentDetails.max}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={uk.paymentDetails.placeholder}
            aria-invalid={errors.paymentDetails ? true : undefined}
            aria-describedby={noteId}
            className={`mt-1 ${fieldInputClass(errors.paymentDetails)}`}
          />
          <FieldNote id={noteId} error={errors.paymentDetails} hint={uk.paymentDetails.hint} />
          {bannerError ? (
            <div className="mt-2">
              <FormError error={bannerError} />
            </div>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" className="px-3 py-1.5" onClick={() => setEditing(false)}>
              {uk.paymentDetails.cancel}
            </Button>
            <Button type="submit" className="px-4 py-1.5" disabled={save.isPending}>
              {uk.paymentDetails.save}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
