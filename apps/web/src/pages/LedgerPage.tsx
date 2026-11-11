import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { useAddMember, useLedger } from "../api/ledgers";
import { useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { MemberRow } from "../components/MemberRow";
import { StateChip } from "../components/StateChip";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { UsersIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";

export function LedgerPage() {
  const { ledgerId = "" } = useParams();
  const ledger = useLedger(ledgerId);
  const addMember = useAddMember(ledgerId);
  const [name, setName] = useState("");
  useAuthRedirect(ledger.error);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    addMember.mutate({ name }, { onSuccess: () => setName("") });
  }

  const backLink = (
    <Link to="/ledgers" className="text-sm font-medium text-slate-500 hover:text-slate-700">
      {uk.ledger.back}
    </Link>
  );

  if (ledger.error instanceof ApiError && ledger.error.code === "LEDGER_NOT_FOUND") {
    return (
      <AppShell>
        {backLink}
        <Card className="mt-6 py-10 text-center text-slate-500">{uk.ledger.notFound}</Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {backLink}

      {ledger.isPending ? <p className="mt-6 text-slate-500">{uk.common.loading}</p> : null}

      {ledger.data ? (
        <>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-slate-900">
              {ledger.data.ledger.name}
            </h1>
            <div className="mt-1 shrink-0">
              <StateChip state={ledger.data.ledger.state} />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{uk.ledger.membersTitle}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {ledger.data.members.length}
            </span>
          </div>
          <Card className="mt-2 py-1">
            <ul className="divide-y divide-slate-100">
              {ledger.data.members.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </ul>
          </Card>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">{uk.ledger.addMemberTitle}</h2>
          <Card className="mt-2">
            <form onSubmit={handleAdd} className="flex gap-2" noValidate>
              <input
                aria-label={uk.ledger.memberNameLabel}
                required
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={uk.ledger.memberNamePlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
              <Button type="submit" disabled={addMember.isPending} className="shrink-0">
                {uk.ledger.addButton}
              </Button>
            </form>
            {addMember.error ? (
              <div className="mt-3">
                <FormError error={addMember.error} />
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </AppShell>
  );
}
