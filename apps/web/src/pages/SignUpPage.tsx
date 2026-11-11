import { Link, useNavigate } from "react-router";
import { useSignUp } from "../api/auth";
import { AppShell } from "../components/AppShell";
import { AuthForm } from "../components/AuthForm";
import { uk } from "../i18n/uk";

export function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useSignUp();

  return (
    <AppShell>
      <AuthForm
        title={uk.auth.signUpTitle}
        submitLabel={uk.auth.signUpButton}
        pending={signUp.isPending}
        error={signUp.error}
        showPasswordHint
        onSubmit={(credentials) => signUp.mutate(credentials, { onSuccess: () => navigate("/ledgers") })}
        footer={
          <Link to="/signin" className="font-medium text-emerald-700 hover:underline">
            {uk.auth.toSignIn}
          </Link>
        }
      />
    </AppShell>
  );
}
