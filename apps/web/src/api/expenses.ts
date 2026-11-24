import {
  expenseResponseSchema,
  expensesListSchema,
  memberCreatedSchema,
  memberPageSchema,
  settlementSchema,
  type CreateExpenseBody,
  type ExpenseBody,
} from "@babki/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "./client";

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

// Every change refreshes the ledger, its expenses, balances and transfers: a stale list is never shown (BR-26).
function invalidateLedger(queryClient: QueryClient, ledgerId: string) {
  for (const key of ["ledger", "expenses", "settlement"]) {
    void queryClient.invalidateQueries({ queryKey: [key, ledgerId] });
  }
  void queryClient.invalidateQueries({ queryKey: ["ledgers"] });
}

export function useAddExpense(ledgerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExpenseBody) => apiPost(`/api/ledgers/${ledgerId}/expenses`, body, expenseResponseSchema),
    onSuccess: () => invalidateLedger(queryClient, ledgerId),
  });
}

export function useEditExpense(ledgerId: string, expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseBody) =>
      apiPut(`/api/ledgers/${ledgerId}/expenses/${expenseId}`, body, expenseResponseSchema),
    onSuccess: () => invalidateLedger(queryClient, ledgerId),
  });
}

export function useSetPaymentDetails(ledgerId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentDetails: string | null) =>
      apiPut(`/api/ledgers/${ledgerId}/members/${memberId}/payment-details`, { paymentDetails }, memberCreatedSchema),
    onSuccess: () => invalidateLedger(queryClient, ledgerId),
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
