import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { refreshLedger } from "./refresh";

// US-048 / BR-26: "the old list is never shown as the current one". A transfer list cached from
// an earlier visit to "who pays whom" must not be shown again after a change, not even while the
// fresh one is loading.
const OLD_LIST = { transfers: [{ fromMemberId: "max", toMemberId: "olia", amountKopecks: 5_000 }] };

describe("refreshLedger (US-048, BR-26)", () => {
  it("Correcting an amount updates the transfers at once: the cached list of the ledger is dropped", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["settlement", "carpathians"], OLD_LIST);

    await refreshLedger(queryClient, "carpathians");

    expect(queryClient.getQueryData(["settlement", "carpathians"])).toBeUndefined();
  });

  it("the cached lists of other ledgers stay as they are", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["settlement", "carpathians"], OLD_LIST);
    queryClient.setQueryData(["settlement", "odesa"], OLD_LIST);

    await refreshLedger(queryClient, "carpathians");

    expect(queryClient.getQueryData(["settlement", "odesa"])).toEqual(OLD_LIST);
  });

  it("marks the ledger, its expenses and the list of ledgers as out of date", async () => {
    const queryClient = new QueryClient();
    for (const key of [["ledger", "carpathians"], ["expenses", "carpathians"], ["ledgers"]]) {
      queryClient.setQueryData(key, {});
    }

    await refreshLedger(queryClient, "carpathians");

    for (const key of [["ledger", "carpathians"], ["expenses", "carpathians"], ["ledgers"]]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });
});
