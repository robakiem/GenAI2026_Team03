import type { QueryClient } from "@tanstack/react-query";

// After any change of a ledger (US-048, BR-26): the old "who pays whom" list is never shown as the
// current one. A cached list from an earlier visit is dropped, so the page waits for the fresh one
// instead of showing the old amounts while it reloads; the queries on screen are refetched, and the
// returned promise settles when they are, so a mutation stays pending until fresh data is in.
export async function refreshLedger(queryClient: QueryClient, ledgerId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: ["settlement", ledgerId], type: "inactive" });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["settlement", ledgerId] }),
    queryClient.invalidateQueries({ queryKey: ["ledger", ledgerId] }),
    queryClient.invalidateQueries({ queryKey: ["expenses", ledgerId] }),
    queryClient.invalidateQueries({ queryKey: ["ledgers"] }),
  ]);
}
