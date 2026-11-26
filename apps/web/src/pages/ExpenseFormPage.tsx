import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import {
  createExpenseSchema,
  expenseBodySchema,
  formatBp,
  formatKopecks,
  LIMITS,
  parseAmount,
  parsePercent,
  splitExpense,
  type Expense,
  type Member,
  type ParseResult,
  type SplitInput,
  type SplitMode,
  type SplitOutcome,
} from "@babki/shared";
import { useAddExpense, useEditExpense, useExpenses } from "../api/expenses";
import { useLedger } from "../api/ledgers";
import { isUnauthenticated, useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Money } from "../components/Money";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { CheckIcon } from "../components/ui/icons";
import { FieldNote, fieldInputClass, TextField } from "../components/ui/TextField";
import { useFieldErrors } from "../components/useFieldErrors";
import { messageForCode } from "../i18n/errorText";
import { uk } from "../i18n/uk";

const MODES: SplitMode[] = ["EQUAL", "AMOUNTS", "PERCENTAGES"];
const limits = { title: LIMITS.expenseTitle };
const titleSchema = expenseBodySchema.pick({ title: true });

// US-016 … US-020-b (new) and US-031 (edit) share one form.
export function ExpenseFormPage() {
  const { ledgerId = "", expenseId } = useParams();
  const ledger = useLedger(ledgerId);
  const expenses = useExpenses(ledgerId);
  useAuthRedirect(ledger.error);
  useAuthRedirect(expenses.error);

  const isEdit = Boolean(expenseId);
  const back = { to: `/ledgers/${ledgerId}`, label: uk.expenseForm.back };
  const title = isEdit ? uk.expenseForm.editTitle : uk.expenseForm.newTitle;
  const accent = isEdit ? uk.expenseForm.editAccent : uk.expenseForm.newAccent;
  const loadError = [ledger.error, expenses.error].find((error) => error && !isUnauthenticated(error));
  const expense = expenseId ? expenses.data?.expenses.find((item) => item.id === expenseId) : undefined;

  let body;
  if (loadError) body = <FormError error={loadError} />;
  else if (!ledger.data || (isEdit && !expenses.data)) body = <p className="text-ink-soft">{uk.common.loading}</p>;
  else if (ledger.data.ledger.state !== "ACTIVE") {
    body = (
      <p className="rounded-2xl bg-sun-soft px-4 py-3 font-medium text-sun-deep">
        {uk.ledger.readOnly[ledger.data.ledger.state]}
      </p>
    );
  } else body = <ExpenseForm ledgerId={ledgerId} members={ledger.data.members} expense={expense} />;

  return (
    <AppShell back={back} title={title} accent={accent} subtitle={ledger.data?.ledger.name}>
      {isEdit && expenses.data && !expense ? (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 font-medium text-danger">{uk.expenseForm.notFound}</p>
      ) : (
        body
      )}
    </AppShell>
  );
}

type TextMap = Record<string, string>;

function ExpenseForm({ ledgerId, members, expense }: { ledgerId: string; members: Member[]; expense?: Expense }) {
  const navigate = useNavigate();
  const add = useAddExpense(ledgerId);
  const edit = useEditExpense(ledgerId, expense?.id ?? "");
  const mutation = expense ? edit : add;
  const memberOrder = members.map((member) => member.id);
  const shareOf = (id: string) => expense?.shares.find((share) => share.memberId === id);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [amountText, setAmountText] = useState(expense ? formatKopecks(expense.amountKopecks) : "");
  const [payerId, setPayerId] = useState(expense?.payerId ?? members[0]?.id ?? "");
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode ?? "EQUAL");
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(members.map((m) => [m.id, expense ? Boolean(shareOf(m.id)) : true])),
  );
  const [amountTexts, setAmountTexts] = useState<TextMap>(() =>
    Object.fromEntries(
      members.map((m) => [m.id, expense?.splitMode === "AMOUNTS" ? fmt(shareOf(m.id)?.amountKopecks) : ""]),
    ),
  );
  const [percentTexts, setPercentTexts] = useState<TextMap>(() =>
    Object.fromEntries(
      members.map((m) => [
        m.id,
        expense?.splitMode === "PERCENTAGES" ? fmtBp(shareOf(m.id)?.percentBp ?? undefined) : "",
      ]),
    ),
  );
  // One key per form: a retry of the same submission cannot create a second expense (CD-11).
  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [showErrors, setShowErrors] = useState(false);
  const { errors: apiFieldErrors, validate, bannerError } = useFieldErrors(limits, mutation.error);

  const selected = memberOrder.filter((id) => included[id]);
  const amount = parseAmount(amountText);
  const shareInputs = Object.fromEntries(
    selected.map((id) => [
      id,
      mode === "AMOUNTS" ? parseAmount(amountTexts[id] ?? "") : parsePercent(percentTexts[id] ?? ""),
    ]),
  ) as Record<string, ParseResult>;
  const split = buildSplit(mode, selected, shareInputs);
  const outcome: SplitOutcome | null = amount.ok && split ? splitExpense(amount.value, split, memberOrder) : null;

  const amountError = showErrors && !amount.ok ? amountMessage(amount.code) : apiFieldErrors.amountKopecks;
  const participantsError = showErrors && selected.length === 0 ? uk.expenseForm.noParticipants : undefined;
  const splitError = showErrors && outcome && !outcome.ok ? messageForCode(outcome.code, outcome.params) : undefined;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    // Every field error at once: the title is checked even while the amount or the split is wrong.
    const titleOk = validate(titleSchema, { title }) !== null;
    if (!titleOk || !amount.ok || !split || !outcome?.ok) return;
    const payload = { title, amountKopecks: amount.value, payerId, split };
    if (expense) {
      const body = validate(expenseBodySchema, payload);
      if (body) edit.mutate(body, { onSuccess: () => void navigate(`/ledgers/${ledgerId}`) });
    } else {
      const body = validate(createExpenseSchema, { ...payload, clientRequestId });
      if (body) add.mutate(body, { onSuccess: () => void navigate(`/ledgers/${ledgerId}`) });
    }
  }

  const sumKopecks = selected.reduce((sum, id) => {
    const parsed = shareInputs[id];
    return parsed?.ok && mode === "AMOUNTS" ? sum + parsed.value : sum;
  }, 0);
  const sumBp = selected.reduce((sum, id) => {
    const parsed = shareInputs[id];
    return parsed?.ok && mode === "PERCENTAGES" ? sum + parsed.value : sum;
  }, 0);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 md:grid md:grid-cols-2 md:items-start md:gap-10 md:space-y-0"
    >
      <div className="space-y-5">
        <Card tone="pink" className="space-y-4">
          <TextField
            id="title"
            label={uk.expenseForm.titleLabel}
            placeholder={uk.expenseForm.titlePlaceholder}
            maxLength={LIMITS.expenseTitle.max}
            value={title}
            error={apiFieldErrors.title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextField
            id="amount"
            label={uk.expenseForm.amountLabel}
            placeholder={uk.expenseForm.amountPlaceholder}
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            error={amountError}
            onChange={(event) => setAmountText(event.target.value)}
            className="text-2xl font-bold"
          />
        </Card>

        <fieldset>
          <legend className="text-lg font-extrabold text-ink">{uk.expenseForm.payerLabel}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member) => (
              <label
                key={member.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-pink/30 ${
                  payerId === member.id
                    ? "border-pink bg-pink text-on-accent"
                    : "border-line bg-paper text-ink hover:border-pink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="payer"
                  className="sr-only"
                  checked={payerId === member.id}
                  onChange={() => setPayerId(member.id)}
                />
                <Avatar name={member.name} position={member.position} size={26} />
                {member.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-extrabold text-ink">{uk.expenseForm.modeLabel}</legend>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-full border-2 border-sky-soft bg-paper p-1">
            {MODES.map((item) => (
              <label
                key={item}
                className={`cursor-pointer rounded-full px-2 py-1.5 text-center text-sm font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-sky/30 ${
                  mode === item ? "bg-sky text-on-accent" : "text-sky-deep hover:bg-sky-soft/60"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  className="sr-only"
                  checked={mode === item}
                  onChange={() => setMode(item)}
                />
                {uk.splitMode[item]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="space-y-5">
        <fieldset aria-describedby="participants-note">
          <div className="flex items-end justify-between">
            <legend className="text-lg font-extrabold text-ink">{uk.expenseForm.participantsLabel}</legend>
            <button
              type="button"
              className="rounded-full px-2 text-sm font-semibold text-pink-deep hover:underline"
              onClick={() => setIncluded(Object.fromEntries(memberOrder.map((id) => [id, true])))}
            >
              {uk.expenseForm.selectAll}
            </button>
          </div>
          <Card tone="sky" className="mt-2 py-1">
            <ul className="divide-y-2 divide-dashed divide-sky-soft">
              {members.map((member) => {
                const on = Boolean(included[member.id]);
                const preview = outcome?.ok ? outcome.shares.find((share) => share.memberId === member.id) : undefined;
                const parsed = shareInputs[member.id];
                const inputError = showErrors && on && parsed && !parsed.ok;
                return (
                  <li key={member.id} className="flex items-center gap-2.5 py-2.5">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={on}
                        onChange={(event) => setIncluded((prev) => ({ ...prev, [member.id]: event.target.checked }))}
                      />
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-sky/30 ${
                          on ? "border-sky bg-sky text-on-accent" : "border-line bg-paper text-transparent"
                        }`}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <Avatar name={member.name} position={member.position} size={30} />
                      <span className={`truncate font-semibold ${on ? "text-ink" : "text-ink-soft line-through"}`}>
                        {member.name}
                      </span>
                    </label>
                    {on && mode !== "EQUAL" ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <input
                          aria-label={
                            mode === "AMOUNTS"
                              ? uk.expenseForm.shareAmountLabel(member.name)
                              : uk.expenseForm.sharePercentLabel(member.name)
                          }
                          aria-invalid={inputError ? true : undefined}
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={mode === "AMOUNTS" ? "0.00" : "0"}
                          value={(mode === "AMOUNTS" ? amountTexts : percentTexts)[member.id] ?? ""}
                          onChange={(event) =>
                            (mode === "AMOUNTS" ? setAmountTexts : setPercentTexts)((prev) => ({
                              ...prev,
                              [member.id]: event.target.value,
                            }))
                          }
                          className={`text-right ${fieldInputClass(inputError ? "x" : undefined, "compact")}`}
                        />
                        <span className="w-4 text-sm font-semibold text-ink-soft">
                          {mode === "AMOUNTS" ? "₴" : "%"}
                        </span>
                      </div>
                    ) : null}
                    {on && mode !== "AMOUNTS" && preview ? (
                      <Money kopecks={preview.amountKopecks} className="shrink-0 text-sm font-bold text-sky-deep" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {mode === "AMOUNTS" && amount.ok ? (
              <SumLine
                label={sumKopecks <= amount.value ? uk.expenseForm.amountsLeft : uk.expenseForm.amountsOver}
                value={<Money kopecks={Math.abs(amount.value - sumKopecks)} />}
                good={sumKopecks === amount.value}
              />
            ) : null}
            {mode === "PERCENTAGES" ? (
              <SumLine label={uk.expenseForm.percentTotal} value={`${formatBp(sumBp)} %`} good={sumBp === 10_000} />
            ) : null}
          </Card>
          <FieldNote
            id="participants-note"
            error={participantsError ?? (showErrors && !split ? amountMessage("INVALID_TYPE", mode) : undefined)}
          />
        </fieldset>

        {splitError ? (
          <p
            role="alert"
            className="rounded-2xl border-2 border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
          >
            {splitError}
          </p>
        ) : null}
        <FormError error={bannerError} />

        <Button type="submit" disabled={mutation.isPending} className="w-full py-3 text-base">
          {expense ? uk.expenseForm.submitEdit : uk.expenseForm.submitNew}
        </Button>
      </div>
    </form>
  );
}

function SumLine({ label, value, good }: { label: string; value: ReactNode; good: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-t-2 border-sky-soft py-2.5 text-sm font-semibold ${
        good ? "text-leaf-deep" : "text-ink-soft"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// The split to send, or null while a share input of the selected members is not a valid number.
function buildSplit(mode: SplitMode, ids: string[], inputs: Record<string, ParseResult>): SplitInput | null {
  if (ids.length === 0) return null;
  if (mode === "EQUAL") return { mode, participantIds: ids };
  const values: number[] = [];
  for (const id of ids) {
    const parsed = inputs[id];
    if (!parsed?.ok) return null;
    values.push(parsed.value);
  }
  return mode === "AMOUNTS"
    ? { mode, shares: ids.map((memberId, i) => ({ memberId, amountKopecks: values[i] })) }
    : { mode, shares: ids.map((memberId, i) => ({ memberId, percentBp: values[i] })) };
}

function amountMessage(code: string, mode: SplitMode = "AMOUNTS"): string {
  if (code === "REQUIRED") return uk.fieldErrors.required;
  if (mode === "PERCENTAGES")
    return code === "OUT_OF_RANGE" ? uk.amountErrors.percentOutOfRange : uk.amountErrors.percentInvalid;
  return code === "OUT_OF_RANGE" ? uk.amountErrors.outOfRange : uk.amountErrors.invalid;
}

const fmt = (kopecks: number | undefined) => (kopecks === undefined ? "" : formatKopecks(kopecks));
const fmtBp = (bp: number | undefined) => (bp === undefined ? "" : formatBp(bp));
