import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "./client";

// Send the user to the sign-in screen when a Coordinator request answers 401 (BR-21).
export function useAuthRedirect(error: unknown): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      void navigate("/signin", { replace: true });
    }
  }, [error, navigate]);
}
