import {
  expenseResponseSchema,
  expensesListSchema,
  memberCreatedSchema,
  memberPageSchema,
  settlementSchema,
  type CreateExpenseBody,
  type ExpenseBody,
} from "@babki/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "./client";
import { refreshLedger } from "./refresh";

export function useExpenses(ledgerId: string) {
  return useQuery({
    queryKey: ["expenses", ledgerId],
    queryFn: () => apiGet(`/api/ledgers/${ledgerId}/expenses`, expensesListSchema),
    retry: false,
  });
}

export function useSettlement(ledgerId: string) {
  return useQuery({
    queryKey: ["settlement", ledgerId],
    queryFn: () => apiGet(`/api/ledgers/${ledgerId}/settlement`, settlementSchema),
    retry: false,
  });
}

export function useAddExpense(ledgerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExpenseBody) => apiPost(`/api/ledgers/${ledgerId}/expenses`, body, expenseResponseSchema),
    onSuccess: () => refreshLedger(queryClient, ledgerId),
  });
}

export function useEditExpense(ledgerId: string, expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseBody) =>
      apiPut(`/api/ledgers/${ledgerId}/expenses/${expenseId}`, body, expenseResponseSchema),
    onSuccess: () => refreshLedger(queryClient, ledgerId),
  });
}

export function useSetPaymentDetails(ledgerId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentDetails: string | null) =>
      apiPut(`/api/ledgers/${ledgerId}/members/${memberId}/payment-details`, { paymentDetails }, memberCreatedSchema),
    onSuccess: () => refreshLedger(queryClient, ledgerId),
  });
}

// EP-18: the friend's own page; the token is the only credential.
export function useMemberPage(token: string) {
  return useQuery({
    queryKey: ["link", token],
    queryFn: () => apiGet(`/api/links/${encodeURIComponent(token)}`, memberPageSchema),
    retry: false,
  });
}
