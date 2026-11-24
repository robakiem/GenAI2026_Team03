import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { addMemberSchema, LIMITS, type Expense, type Member } from "@babki/shared";
import { ApiError } from "../api/client";
import { useExpenses } from "../api/expenses";
import { useAddMember, useLedger } from "../api/ledgers";
import { isUnauthenticated, useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { FlowerRow, Sprig } from "../components/decor/Flowers";
import { MemberRow } from "../components/MemberRow";
import { Money } from "../components/Money";
import { SectionTitle } from "../components/SectionTitle";
import { StateChip } from "../components/StateChip";
import { Avatar } from "../components/ui/Avatar";
import { Button, buttonClass } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { ChevronRightIcon, PlusIcon } from "../components/ui/icons";
import { FieldNote, fieldInputClass } from "../components/ui/TextField";
import { useFieldErrors } from "../components/useFieldErrors";
import { uk } from "../i18n/uk";

const limits = { name: LIMITS.memberName };
const back = { to: "/ledgers", label: uk.ledger.back };

export function LedgerPage() {
  const { ledgerId = "" } = useParams();
  const ledger = useLedger(ledgerId);
  const expenses = useExpenses(ledgerId);
  const addMember = useAddMember(ledgerId);
  const [name, setName] = useState("");
  const { errors, validate, bannerError } = useFieldErrors(limits, addMember.error);
  useAuthRedirect(ledger.error);
  useAuthRedirect(expenses.error);
  useAuthRedirect(addMember.error);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const body = validate(addMemberSchema, { name });
    if (!body) return;
    addMember.mutate(body, { onSuccess: () => setName("") });
  }

  if (ledger.error instanceof ApiError && ledger.error.code === "LEDGER_NOT_FOUND") {
    return (
      <AppShell back={back} title={uk.ledger.notFound}>
        <FlowerRow />
      </AppShell>
    );
  }

  // Any other failure (network, 500) is shown instead of an empty page; 401 redirects instead.
  const loadError = ledger.error && !isUnauthenticated(ledger.error) ? ledger.error : null;
  const expensesError = expenses.error && !isUnauthenticated(expenses.error) ? expenses.error : null;
  const data = ledger.data;
  const editable = data?.ledger.state === "ACTIVE";

  return (
    <AppShell
      back={back}
      title={data?.ledger.name ?? " "}
      subtitle={data ? <StateChip state={data.ledger.state} /> : null}
    >
      {ledger.isPending ? <p className="text-ink-soft">{uk.common.loading}</p> : null}
      {loadError ? <FormError error={loadError} /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
            {editable ? (
              <Link to={`/ledgers/${ledgerId}/expenses/new`} className={buttonClass("primary", "px-3")}>
                <PlusIcon className="h-5 w-5 shrink-0" />
                {uk.ledger.addExpense}
              </Link>
            ) : null}
            <Link
              to={`/ledgers/${ledgerId}/transfers`}
              className={buttonClass("sky", editable ? "px-3" : "col-span-2 px-3")}
            >
              {uk.ledger.toSettlement}
            </Link>
          </div>

          <div className="mt-9 md:grid md:grid-cols-[3fr_2fr] md:items-start md:gap-10">
            <div>
              <SectionTitle title={uk.ledger.expensesTitle} count={expenses.data?.expenses.length} />
              {data.ledger.state !== "ACTIVE" ? (
                <p className="mt-2 rounded-2xl bg-sun-soft px-4 py-2.5 text-sm font-medium text-sun-deep">
                  {uk.ledger.readOnly[data.ledger.state]}
                </p>
              ) : null}
              {expensesError ? (
                <div className="mt-3">
                  <FormError error={expensesError} />
                </div>
              ) : null}
              {expenses.data && expenses.data.expenses.length === 0 ? (
                <Card className="mt-3 text-center" tone="sun">
                  <Sprig className="mx-auto h-10 w-32" />
                  <p className="mt-2 text-ink-soft">{uk.ledger.noExpenses}</p>
                </Card>
              ) : null}
              {expenses.data && expenses.data.expenses.length > 0 ? (
                <ExpenseList
                  expenses={expenses.data.expenses}
                  members={data.members}
                  ledgerId={ledgerId}
                  editable={editable}
                />
              ) : null}
            </div>
            <div className="mt-9 md:mt-0">
              <SectionTitle title={uk.ledger.membersTitle} count={data.members.length} />
              <Card className="mt-3 py-1" tone="pink">
                <ul className="divide-y-2 divide-dashed divide-pink-soft">
                  {data.members.map((member) => (
                    <MemberRow key={member.id} member={member} ledgerId={ledgerId} />
                  ))}
                </ul>
              </Card>

              {editable ? (
                <>
                  <SectionTitle title={uk.ledger.addMemberTitle} accent={uk.ledger.addMemberAccent} />
                  <Card className="mt-3" tone="leaf">
                    <form onSubmit={handleAdd} className="flex gap-2" noValidate>
                      <input
                        aria-label={uk.ledger.memberNameLabel}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "member-name-note" : undefined}
                        required
                        maxLength={LIMITS.memberName.max}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={uk.ledger.memberNamePlaceholder}
                        className={fieldInputClass(errors.name)}
                      />
                      <Button type="submit" disabled={addMember.isPending} className="shrink-0">
                        {uk.ledger.addButton}
                      </Button>
                    </form>
                    <FieldNote id="member-name-note" error={errors.name} />
                    {bannerError ? (
                      <div className="mt-3">
                        <FormError error={bannerError} />
                      </div>
                    ) : null}
                  </Card>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function ExpenseList({
  expenses,
  members,
  ledgerId,
  editable,
}: {
  expenses: Expense[];
  members: Member[];
  ledgerId: string;
  editable: boolean;
}) {
  const byId = new Map(members.map((member) => [member.id, member]));
  const total = expenses.reduce((sum, expense) => sum + expense.amountKopecks, 0);
  return (
    <Card className="mt-3 py-1" tone="sun">
      <ul className="divide-y-2 divide-dashed divide-sun-soft">
        {expenses.map((expense) => {
          const payer = byId.get(expense.payerId);
          const content = (
            <>
              <Avatar name={payer?.name ?? "?"} position={payer?.position ?? 1} size={36} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold leading-snug text-ink">{expense.title}</p>
                <p className="text-xs text-ink-soft">
                  {payer?.name} {uk.ledger.paidBy} · {uk.ledger.sharedBy(expense.shares.length)} ·{" "}
                  {uk.splitMode[expense.splitMode].toLowerCase()}
                </p>
              </div>
              <Money kopecks={expense.amountKopecks} className="font-bold text-ink" />
              {editable ? <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-soft" /> : null}
            </>
          );
          return (
            <li key={expense.id}>
              {editable ? (
                <Link
                  to={`/ledgers/${ledgerId}/expenses/${expense.id}/edit`}
                  aria-label={`${uk.ledger.edit}: ${expense.title}`}
                  className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-sun-soft/40"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t-2 border-sun-soft py-3 text-sm">
        <span className="font-semibold text-ink-soft">{uk.ledger.total}</span>
        <Money kopecks={total} className="text-base font-extrabold text-ink" />
      </div>
    </Card>
  );
}
