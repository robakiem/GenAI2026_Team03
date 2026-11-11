import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "./client";

export const isUnauthenticated = (error: unknown): boolean => error instanceof ApiError && error.status === 401;

// Send the user to the sign-in screen when a Coordinator request answers 401 (BR-21).
export function useAuthRedirect(error: unknown): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (isUnauthenticated(error)) {
      void navigate("/signin", { replace: true });
    }
  }, [error, navigate]);
}
