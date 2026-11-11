import { Link, useNavigate } from "react-router";
import { useSignOut } from "../api/auth";
import { useLedgers } from "../api/ledgers";
import { useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "../components/ui/icons";
import { StateChip } from "../components/StateChip";
import { uk } from "../i18n/uk";

export function LedgersPage() {
  const navigate = useNavigate();
  const ledgers = useLedgers();
  const signOut = useSignOut();
  useAuthRedirect(ledgers.error);

  const list = ledgers.data?.ledgers;

  return (
    <AppShell
      headerRight={
        <Button
          variant="ghost"
          className="px-3 py-1.5"
          onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate("/signin") })}
        >
          {uk.auth.signOutButton}
        </Button>
      }
    >
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{uk.ledgers.title}</h1>

      <Button className="mt-4 w-full" onClick={() => navigate("/ledgers/new")}>
        <PlusIcon className="h-5 w-5" />
        {uk.ledgers.create}
      </Button>

      {ledgers.isPending ? <p className="mt-6 text-slate-500">{uk.common.loading}</p> : null}

      {list && list.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <UsersIcon className="h-6 w-6" />
          </span>
          <p className="mt-3 text-slate-500">{uk.ledgers.empty}</p>
        </Card>
      ) : null}

      {list && list.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {list.map((ledger) => (
            <li key={ledger.id}>
              <Link
                to={`/ledgers/${ledger.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{ledger.name}</p>
                  <div className="mt-1.5">
                    <StateChip state={ledger.state} />
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
