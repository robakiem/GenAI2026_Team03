import { useParams } from "react-router";
import type { MemberPage as MemberPageData } from "@babki/shared";
import { ApiError } from "../api/client";
import { useMemberPage } from "../api/expenses";
import { AppShell } from "../components/AppShell";
import { FlowerRow, Sprig } from "../components/decor/Flowers";
import { Money } from "../components/Money";
import { SectionTitle } from "../components/SectionTitle";
import { useCopy } from "../components/useCopy";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { FormError } from "../components/ui/FormError";
import { CheckIcon, CopyIcon } from "../components/ui/icons";
import { uk } from "../i18n/uk";

// US-009, US-030, US-050: a friend's own page, opened by the personal link without signing in.
// It shows only this member's amounts and has no buttons that change anything (BR-39, BR-40).
export function MemberPage() {
  const { token = "" } = useParams();
  const page = useMemberPage(token);

  if (page.error instanceof ApiError && page.error.code === "LINK_NOT_FOUND") {
    // Neutral: no ledger or member name (BR-41).
    return (
      <AppShell title={uk.member.notFoundTitle} accent={uk.member.notFoundAccent}>
        <p className="text-ink-soft">{uk.member.notFoundText}</p>
        <FlowerRow className="mt-8" />
      </AppShell>
    );
  }

  if (!page.data) {
    return (
      <AppShell title=" ">
        {page.error ? <FormError error={page.error} /> : <p className="text-ink-soft">{uk.common.loading}</p>}
      </AppShell>
    );
  }

  return (
    <AppShell title={uk.member.hello} accent={page.data.member.name} subtitle={page.data.ledger.name}>
      <Content data={page.data} />
    </AppShell>
  );
}

function Content({ data }: { data: MemberPageData }) {
  return (
    <>
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-10">
        <div>
          <SectionTitle title={uk.member.youPayTitle} accent={uk.member.youPayAccent} />
          {data.youPay.length === 0 ? (
            <Card className="mt-3 text-ink-soft" tone="leaf">
              {uk.member.nothingToPay}
            </Card>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.youPay.map((transfer) => (
                <PayCard key={transfer.toMemberId} transfer={transfer} />
              ))}
            </ul>
          )}

          <SectionTitle title={uk.member.youReceiveTitle} accent={uk.member.youReceiveAccent} />
          {data.youReceive.length === 0 ? (
            <Card className="mt-3 text-ink-soft" tone="leaf">
              {uk.member.nothingToReceive}
            </Card>
          ) : (
            <Card className="mt-3 py-1" tone="leaf">
              <ul className="divide-y-2 divide-dashed divide-leaf-soft">
                {data.youReceive.map((transfer) => (
                  <li key={transfer.fromMemberId} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0 truncate">
                      <span className="text-ink-soft">{uk.member.from} </span>
                      <span className="font-bold">{transfer.fromName}</span>
                    </span>
                    <Money kopecks={transfer.amountKopecks} className="font-extrabold text-leaf-deep" />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="mt-9 md:mt-0">
          <SectionTitle title={uk.member.breakdownTitle} accent={uk.member.breakdownAccent} />
          <Card className="mt-3" tone="sun">
            {data.breakdown.lines.length === 0 ? (
              <div className="text-center">
                <Sprig className="mx-auto h-10 w-32" />
                <p className="mt-2 text-ink-soft">{uk.member.noExpenses}</p>
              </div>
            ) : (
              <>
                <ul className="divide-y-2 divide-dashed divide-sun-soft">
                  {data.breakdown.lines.map((line, i) => (
                    <li key={i} className="py-2.5">
                      <p className="truncate font-bold">{line.title}</p>
                      <div className="mt-0.5 flex justify-between gap-2 text-sm text-ink-soft">
                        <span>
                          {uk.member.paid}: <Money kopecks={line.paidKopecks} className="text-ink" />
                        </span>
                        <span>
                          {uk.member.share}: <Money kopecks={line.shareKopecks} className="text-ink" />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="mt-2 space-y-1 border-t-2 border-sun-soft pt-3 text-sm">
                  <Row label={uk.member.totalPaid} kopecks={data.breakdown.totalPaidKopecks} />
                  <Row label={uk.member.totalShares} kopecks={data.breakdown.totalSharesKopecks} />
                  <Row label={uk.member.balance} kopecks={data.breakdown.balanceKopecks} signed strong />
                </dl>
              </>
            )}
          </Card>
        </div>
      </div>
      <FlowerRow className="mt-8 md:mt-14" />
    </>
  );
}

function PayCard({ transfer }: { transfer: MemberPageData["youPay"][number] }) {
  const { copied, copy } = useCopy();
  return (
    <li className="rounded-[28px] border-2 border-pink-soft bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">
          <span className="text-ink-soft">{uk.member.to} </span>
          <span className="text-lg font-bold">{transfer.toName}</span>
        </span>
        <Money kopecks={transfer.amountKopecks} className="text-xl font-extrabold text-pink-deep" />
      </div>
      {transfer.paymentDetails ? (
        <div className="mt-3 rounded-2xl bg-cream p-3">
          <p className="break-words font-mono text-sm">{transfer.paymentDetails}</p>
          <Button variant="secondary" className="mt-2 w-full" onClick={() => void copy(transfer.paymentDetails ?? "")}>
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? uk.member.copied : uk.member.copyDetails}
          </Button>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-sun-soft px-3 py-2 text-sm font-medium text-sun-deep">
          {uk.member.noDetails}
        </p>
      )}
      {transfer.state !== "OPEN" ? (
        <p className="mt-2 text-xs font-semibold text-ink-soft">{uk.transferState[transfer.state]}</p>
      ) : null}
    </li>
  );
}

function Row({
  label,
  kopecks,
  signed,
  strong,
}: {
  label: string;
  kopecks: number;
  signed?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? "text-base font-extrabold" : "text-ink-soft"}`}>
      <dt>{label}</dt>
      <dd>
        <Money kopecks={kopecks} signed={signed} className={strong ? "text-ink" : "text-ink"} />
      </dd>
    </div>
  );
}
