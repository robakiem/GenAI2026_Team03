import type { CSSProperties } from "react";
import { useParams } from "react-router";
import type { Member, Settlement } from "@babki/shared";
import { useSettlement } from "../api/expenses";
import { useLedger } from "../api/ledgers";
import { isUnauthenticated, useAuthRedirect } from "../api/useAuthRedirect";
import { AppShell } from "../components/AppShell";
import { Flower, FlowerRow } from "../components/decor/Flowers";
import { Money } from "../components/Money";
import { SectionTitle } from "../components/SectionTitle";
import { Avatar } from "../components/ui/Avatar";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { ChevronRightIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";

// US-044, US-048: balances and the proposed list "who pays whom" (EP-14).
export function SettlementPage() {
  const { ledgerId = "" } = useParams();
  const ledger = useLedger(ledgerId);
  const settlement = useSettlement(ledgerId);
  useAuthRedirect(ledger.error);
  useAuthRedirect(settlement.error);

  const loadError = [ledger.error, settlement.error].find((error) => error && !isUnauthenticated(error));
  const back = { to: `/ledgers/${ledgerId}`, label: uk.expenseForm.back };

  return (
    <AppShell
      back={back}
      title={uk.settlement.title}
      accent={uk.settlement.accent}
      subtitle={ledger.data?.ledger.name}
      tone="sky"
    >
      {loadError ? <FormError error={loadError} /> : null}
      {!loadError && (!ledger.data || !settlement.data) ? <p className="text-ink-soft">{uk.common.loading}</p> : null}
      {ledger.data && settlement.data ? <Overview members={ledger.data.members} settlement={settlement.data} /> : null}
    </AppShell>
  );
}

function Overview({ members, settlement }: { members: Member[]; settlement: Settlement }) {
  const byId = new Map(members.map((member) => [member.id, member]));
  const max = Math.max(1, ...settlement.balances.map((b) => Math.abs(b.balanceKopecks)));

  return (
    <>
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-10">
        <div>
          <section
            className="scallop-bottom relative rounded-t-[32px] bg-pink px-5 pb-6 pt-5 text-on-accent"
            style={{ "--scallop-color": "var(--color-pink)", "--scallop": "16px" } as CSSProperties}
          >
            <Flower
              petal="var(--color-sun)"
              center="var(--petal-light)"
              className="pointer-events-none absolute -right-2 -top-4 h-14 w-14 rotate-12"
            />
            <h2 className="text-2xl font-extrabold tracking-tight">
              {uk.settlement.transfersTitle}
              <span className="accent text-sun"> {uk.settlement.transfersAccent}</span>
            </h2>
            {settlement.transfers.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-on-accent/15 px-4 py-3 font-semibold">{uk.settlement.noTransfers}</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {settlement.transfers.map((transfer) => {
                  const from = byId.get(transfer.fromMemberId);
                  const to = byId.get(transfer.toMemberId);
                  return (
                    <li
                      key={`${transfer.fromMemberId}-${transfer.toMemberId}`}
                      className="rounded-[22px] bg-paper px-3 py-3 text-ink shadow-[0_3px_0_0_var(--color-pink-deep)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={from?.name ?? "?"} position={from?.position ?? 1} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 flex-wrap items-center gap-x-1 break-all font-bold leading-snug">
                            <span>{from?.name}</span>
                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-pink" />
                            <span>{to?.name}</span>
                          </p>
                          <p className="text-xs text-ink-soft">{uk.settlement.pays}</p>
                        </div>
                        <Money kopecks={transfer.amountKopecks} className="text-base font-extrabold text-pink-deep" />
                      </div>
                      {settlement.source === "SAVED" ? (
                        <p className="mt-1.5 pl-1 text-xs font-semibold text-ink-soft">
                          {uk.transferState[transfer.state]}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <p className="mt-8 text-sm text-ink-soft">{uk.settlement.proposedNote}</p>
        </div>
        <div className="mt-9 md:mt-0">
          <SectionTitle title={uk.settlement.balancesTitle} />
          <Card className="mt-3 py-1" tone="sky">
            <ul className="divide-y-2 divide-dashed divide-sky-soft">
              {settlement.balances.map((balance) => {
                const member = byId.get(balance.memberId);
                const value = balance.balanceKopecks;
                const width = `${Math.round((Math.abs(value) / max) * 100)}%`;
                const hint = value > 0 ? uk.settlement.getsBack : value < 0 ? uk.settlement.owes : uk.settlement.even;
                return (
                  <li key={balance.memberId} className="flex items-center gap-3 py-3">
                    <Avatar name={member?.name ?? "?"} position={member?.position ?? 1} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-bold">{member?.name}</span>
                        <Money
                          kopecks={value}
                          signed
                          className={`text-sm font-extrabold ${value > 0 ? "text-leaf-deep" : value < 0 ? "text-pink-deep" : "text-ink-soft"}`}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                          <div
                            className={`h-full rounded-full ${value >= 0 ? "bg-leaf" : "bg-pink"}`}
                            style={{ width }}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-right text-xs text-ink-soft">{hint}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
      <FlowerRow className="mt-8 md:mt-14" />
    </>
  );
}
