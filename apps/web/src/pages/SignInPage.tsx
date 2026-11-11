import { Link, useNavigate } from "react-router";
import { useSignIn } from "../api/auth";
import { AppShell } from "../components/AppShell";
import { AuthForm } from "../components/AuthForm";
import { uk } from "../i18n/uk";

export function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSignIn();

  return (
    <AppShell>
      <AuthForm
        title={uk.auth.signInTitle}
        submitLabel={uk.auth.signInButton}
        pending={signIn.isPending}
        error={signIn.error}
        onSubmit={(credentials) => signIn.mutate(credentials, { onSuccess: () => void navigate("/ledgers") })}
        footer={
          <Link to="/signup" className="font-medium text-emerald-700 hover:underline">
            {uk.auth.toSignUp}
          </Link>
        }
      />
    </AppShell>
  );
}
