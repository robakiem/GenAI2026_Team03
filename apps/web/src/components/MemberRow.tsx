import { useState } from "react";
import type { Member } from "@babki/shared";
import { uk } from "../i18n/uk";
import { CheckIcon, CopyIcon } from "./ui/icons";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return text.toUpperCase() || "?";
}

// One member of a ledger with their shareable personal link (US-007, the Coordinator side).
export function MemberRow({ member }: { member: Member }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/l/${member.linkToken}`;
  const color = AVATAR_COLORS[(member.position - 1) % AVATAR_COLORS.length];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the token stays visible to copy by hand.
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${color}`}>
        {initials(member.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-900">{member.name}</span>
          {member.isCoordinator ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              {uk.ledger.coordinatorBadge}
            </span>
          ) : null}
        </div>
        <span className="mt-0.5 block truncate font-mono text-xs text-slate-400" title={url}>
          /l/{member.linkToken}
        </span>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        {copied ? uk.ledger.copied : uk.ledger.copyLink}
      </button>
    </li>
  );
}
