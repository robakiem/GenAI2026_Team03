import { useState, type FormEvent, type ReactNode } from "react";
import type { ZodType } from "zod";
import type { FieldLimits } from "../i18n/errorText";
import { uk } from "../i18n/uk";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { FormError } from "./ui/FormError";
import { TextField } from "./ui/TextField";
import { useFieldErrors } from "./useFieldErrors";

interface Credentials {
  email: string;
  password: string;
}

interface Props {
  title: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  // The shared schema of the endpoint (sign-up checks limits, sign-in only non-empty fields).
  schema: ZodType<Credentials>;
  limits: FieldLimits;
  passwordHint?: string;
  onSubmit: (credentials: Credentials) => void;
  footer: ReactNode;
}

export function AuthForm({ title, submitLabel, pending, error, schema, limits, passwordHint, onSubmit, footer }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { errors, validate, bannerError } = useFieldErrors(limits, error);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const credentials = validate(schema, { email, password });
    if (credentials) onSubmit(credentials);
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
            maxLength={limits.email?.max}
            label={uk.auth.email}
            error={errors.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            id="password"
            type="password"
            autoComplete={passwordHint ? "new-password" : "current-password"}
            required
            maxLength={limits.password?.max}
            label={uk.auth.password}
            hint={passwordHint}
            error={errors.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FormError error={bannerError} />
          <Button type="submit" disabled={pending} className="w-full">
            {submitLabel}
          </Button>
        </form>
      </Card>
      <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>
    </div>
  );
}
