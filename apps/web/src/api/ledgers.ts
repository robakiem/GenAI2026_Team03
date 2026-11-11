import { ledgersListSchema, ledgerWithMembersSchema, memberCreatedSchema } from "@babki/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";

export function useLedgers() {
  return useQuery({
    queryKey: ["ledgers"],
    queryFn: () => apiGet("/api/ledgers", ledgersListSchema),
    retry: false,
  });
}

export function useLedger(ledgerId: string) {
  return useQuery({
    queryKey: ["ledger", ledgerId],
    queryFn: () => apiGet(`/api/ledgers/${ledgerId}`, ledgerWithMembersSchema),
    retry: false,
  });
}

export function useCreateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; coordinatorName: string }) =>
      apiPost("/api/ledgers", body, ledgerWithMembersSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledgers"] }),
  });
}

export function useAddMember(ledgerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      apiPost(`/api/ledgers/${ledgerId}/members`, body, memberCreatedSchema),
    onSuccess: () => {
      // Never show a stale member list (BR-26).
      queryClient.invalidateQueries({ queryKey: ["ledger", ledgerId] });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
    },
  });
}
