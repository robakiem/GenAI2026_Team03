import { accountResponseSchema } from "@babki/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";

interface Credentials {
  email: string;
  password: string;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet("/api/auth/me", accountResponseSchema),
    retry: false,
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Credentials) => apiPost("/api/auth/signup", body, accountResponseSchema),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      void queryClient.invalidateQueries({ queryKey: ["ledgers"] });
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Credentials) => apiPost("/api/auth/signin", body, accountResponseSchema),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      void queryClient.invalidateQueries({ queryKey: ["ledgers"] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/api/auth/signout"),
    onSuccess: () => queryClient.clear(),
  });
}
