import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { createLedgerSchema, LIMITS } from "@babki/shared";
import { useCreateLedger } from "../api/ledgers";
import { useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { TextField } from "../components/ui/TextField";
import { useFieldErrors } from "../components/useFieldErrors";
import { uk } from "../i18n/uk";

const limits = { name: LIMITS.ledgerName, coordinatorName: LIMITS.memberName };

export function LedgerNewPage() {
  const navigate = useNavigate();
  const createLedger = useCreateLedger();
  const [name, setName] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const { errors, validate, bannerError } = useFieldErrors(limits, createLedger.error);
  useAuthRedirect(createLedger.error);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = validate(createLedgerSchema, { name, coordinatorName });
    if (!body) return;
    createLedger.mutate(body, { onSuccess: (data) => void navigate(`/ledgers/${data.ledger.id}`) });
  }

  return (
    <AppShell>
      <Link to="/ledgers" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        {uk.ledger.back}
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{uk.ledgerNew.title}</h1>

      <Card className="mt-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            id="name"
            required
            maxLength={LIMITS.ledgerName.max}
            label={uk.ledgerNew.nameLabel}
            placeholder={uk.ledgerNew.namePlaceholder}
            error={errors.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            id="coordinatorName"
            required
            maxLength={LIMITS.memberName.max}
            label={uk.ledgerNew.coordinatorLabel}
            placeholder={uk.ledgerNew.coordinatorPlaceholder}
            error={errors.coordinatorName}
            value={coordinatorName}
            onChange={(event) => setCoordinatorName(event.target.value)}
          />
          <FormError error={bannerError} />
          <Button type="submit" disabled={createLedger.isPending} className="w-full">
            {uk.ledgerNew.submit}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
