import { describe, expect, it } from "vitest";
import { formatBp, formatKopecks, parseAmount, parsePercent } from "./money";

// US-016 / BR-01: the text of the amount field is turned into kopecks before anything is sent.
describe("parseAmount (US-016, BR-01)", () => {
  it.each([
    ["0", "OUT_OF_RANGE"],
    ["-1.00", "OUT_OF_RANGE"],
    ["1000000", "OUT_OF_RANGE"],
    ["1.234", "INVALID_TYPE"],
    ["1,50", "INVALID_TYPE"],
    ["abc", "INVALID_TYPE"],
  ])("An invalid amount is refused: %s", (text, code) => {
    expect(parseAmount(text)).toEqual({ ok: false, code });
  });

  it("an empty field is reported as required", () => {
    expect(parseAmount("   ")).toEqual({ ok: false, code: "REQUIRED" });
  });

  it.each([
    ["0.01", 1],
    ["999999.99", 99_999_999],
    ["6000.00", 600_000],
    ["1850.5", 185_050],
    ["420", 42_000],
    [" 362.13 ", 36_213],
  ])("accepts %s as %i kopecks (the limits themselves are accepted)", (text, kopecks) => {
    expect(parseAmount(text)).toEqual({ ok: true, value: kopecks });
  });
});

// US-020-b / BR-08: percentages to hundredths of a percent.
describe("parsePercent (US-020-b, BR-08)", () => {
  it.each([
    ["50", 5000],
    ["33.33", 3333],
    ["0.01", 1],
    ["100", 10_000],
  ])("accepts %s per cent as %i bp", (text, bp) => {
    expect(parsePercent(text)).toEqual({ ok: true, value: bp });
  });

  it.each([
    ["0", "OUT_OF_RANGE"],
    ["100.01", "OUT_OF_RANGE"],
    ["-5", "INVALID_TYPE"],
    ["12.345", "INVALID_TYPE"],
    ["50,5", "INVALID_TYPE"],
    ["", "REQUIRED"],
  ])("refuses %s", (text, code) => {
    expect(parsePercent(text)).toEqual({ ok: false, code });
  });
});

describe("formatting", () => {
  it("shows kopecks with two decimals and a dot", () => {
    expect(formatKopecks(36_213)).toBe("362.13");
    expect(formatKopecks(185_050)).toBe("1850.50");
    expect(formatKopecks(1)).toBe("0.01");
    expect(formatKopecks(0)).toBe("0.00");
    expect(formatKopecks(-193_262)).toBe("-1932.62");
  });

  it("parsing a formatted amount gives the same kopecks back", () => {
    for (const kopecks of [1, 99, 100, 36_213, 99_999_999]) {
      expect(parseAmount(formatKopecks(kopecks))).toEqual({ ok: true, value: kopecks });
    }
  });

  it("shows percentages without needless zeros", () => {
    expect(formatBp(5000)).toBe("50");
    expect(formatBp(3333)).toBe("33.33");
    expect(formatBp(1250)).toBe("12.50");
  });
});
