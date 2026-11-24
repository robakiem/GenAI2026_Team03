import type { ValidationDetailCode } from "./errors";
import { LIMITS } from "./limits";

// Text of a form field → whole kopecks / hundredths of a percent (CD-07, BR-01, BR-08).
// The API only ever receives the integers; this is where "1,50", "1.234" and "abc" stop.
export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; code: Extract<ValidationDetailCode, "REQUIRED" | "INVALID_TYPE" | "OUT_OF_RANGE"> };

const DECIMAL = /^-?\d+(\.\d{1,2})?$/;

// Whole hundredths of a decimal text with at most two decimals, without floating point.
function toHundredths(text: string): number {
  const negative = text.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -value : value;
}

function parseHundredths(text: string, min: number, max: number): ParseResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, code: "REQUIRED" };
  if (!DECIMAL.test(trimmed)) return { ok: false, code: "INVALID_TYPE" };
  const value = toHundredths(trimmed);
  if (value < min || value > max) return { ok: false, code: "OUT_OF_RANGE" };
  return { ok: true, value };
}

export function parseAmount(text: string): ParseResult {
  return parseHundredths(text, LIMITS.amountKopecks.min, LIMITS.amountKopecks.max);
}

export function parsePercent(text: string): ParseResult {
  if (text.trim().startsWith("-")) return { ok: false, code: "INVALID_TYPE" };
  return parseHundredths(text, LIMITS.percentBp.min, LIMITS.percentBp.max);
}

// 36213 → "362.13"; -193262 → "-1932.62".
export function formatKopecks(kopecks: number): string {
  const sign = kopecks < 0 ? "-" : "";
  const abs = Math.abs(kopecks);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// 5000 → "50"; 3333 → "33.33"; 1250 → "12.50".
export function formatBp(bp: number): string {
  return bp % 100 === 0 ? String(bp / 100) : formatKopecks(bp);
}
