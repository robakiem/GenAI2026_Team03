import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useCreateLedger } from "../api/ledgers";
import { useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { TextField } from "../components/ui/TextField";
import { uk } from "../i18n/uk";

export function LedgerNewPage() {
  const navigate = useNavigate();
  const createLedger = useCreateLedger();
  const [name, setName] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  useAuthRedirect(createLedger.error);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createLedger.mutate({ name, coordinatorName }, { onSuccess: (data) => navigate(`/ledgers/${data.ledger.id}`) });
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
            maxLength={60}
            label={uk.ledgerNew.nameLabel}
            placeholder={uk.ledgerNew.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            id="coordinatorName"
            required
            maxLength={40}
            label={uk.ledgerNew.coordinatorLabel}
            placeholder={uk.ledgerNew.coordinatorPlaceholder}
            value={coordinatorName}
            onChange={(event) => setCoordinatorName(event.target.value)}
          />
          <FormError error={createLedger.error} />
          <Button type="submit" disabled={createLedger.isPending} className="w-full">
            {uk.ledgerNew.submit}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
