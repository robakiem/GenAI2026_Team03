import { Link, useNavigate } from "react-router";
import { useSignOut } from "../api/auth";
import { useLedgers } from "../api/ledgers";
import { isUnauthenticated, useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Flower, Sprig } from "../components/decor/Flowers";
import { StateChip } from "../components/StateChip";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { ChevronRightIcon, PlusIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";

const CARD_COLORS = [
  { border: "border-pink-soft hover:border-pink", petal: "var(--petal-pink)", center: "var(--color-pink)" },
  { border: "border-sky-soft hover:border-sky", petal: "var(--petal-sky)", center: "var(--color-sky)" },
  { border: "border-sun-soft hover:border-sun", petal: "var(--petal-sun)", center: "var(--color-sun)" },
  { border: "border-leaf-soft hover:border-leaf", petal: "var(--petal-leaf)", center: "var(--color-leaf)" },
];

export function LedgersPage() {
  const navigate = useNavigate();
  const ledgers = useLedgers();
  const signOut = useSignOut();
  useAuthRedirect(ledgers.error);

  const list = ledgers.data?.ledgers;
  // Any failure but 401 (which redirects) is shown instead of an empty page: network, 500.
  const loadError = ledgers.error && !isUnauthenticated(ledgers.error) ? ledgers.error : null;

  return (
    <AppShell
      title={uk.ledgers.title}
      accent={uk.ledgers.accent}
      headerRight={
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-on-accent hover:bg-on-accent/15 hover:text-on-accent"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate(undefined, { onSuccess: () => void navigate("/signin") })}
        >
          {uk.auth.signOutButton}
        </Button>
      }
    >
      {signOut.error ? (
        <div className="mb-4">
          <FormError error={signOut.error} />
        </div>
      ) : null}

      <Button className="w-full py-3 md:w-auto md:px-8" onClick={() => void navigate("/ledgers/new")}>
        <PlusIcon className="h-5 w-5" />
        {uk.ledgers.create}
      </Button>

      {ledgers.isPending ? <p className="mt-6 text-ink-soft">{uk.common.loading}</p> : null}

      {loadError ? (
        <div className="mt-6">
          <FormError error={loadError} />
        </div>
      ) : null}

      {list && list.length === 0 ? (
        <Card className="mt-6 py-8 text-center md:max-w-md" tone="sun">
          <Sprig className="mx-auto h-10 w-32" />
          <p className="mt-3 text-ink-soft">{uk.ledgers.empty}</p>
        </Card>
      ) : null}

      {list && list.length > 0 ? (
        <ul className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {list.map((ledger, i) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <li key={ledger.id}>
                <Link
                  to={`/ledgers/${ledger.id}`}
                  className={`flex h-full items-center gap-3 rounded-[28px] border-2 bg-paper p-4 transition hover:-translate-y-0.5 md:p-5 ${color.border}`}
                >
                  <Flower petal={color.petal} center={color.center} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-ink">{ledger.name}</p>
                    <div className="mt-1">
                      <StateChip state={ledger.state} />
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </AppShell>
  );
}
