import { useState, type FormEvent, type ReactNode } from "react";
import { uk } from "../i18n/uk";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { FormError } from "./ui/FormError";
import { TextField } from "./ui/TextField";

interface Props {
  title: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  showPasswordHint?: boolean;
  onSubmit: (credentials: { email: string; password: string }) => void;
  footer: ReactNode;
}

export function AuthForm({ title, submitLabel, pending, error, showPasswordHint, onSubmit, footer }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <Card className="mt-5">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            id="email"
            type="email"
            autoComplete="email"
            required
            label={uk.auth.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            id="password"
            type="password"
            autoComplete={showPasswordHint ? "new-password" : "current-password"}
            required
            label={uk.auth.password}
            hint={showPasswordHint ? uk.auth.passwordHint : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormError error={error} />
          <Button type="submit" disabled={pending} className="w-full">
            {submitLabel}
          </Button>
        </form>
      </Card>
      <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>
    </div>
  );
}
