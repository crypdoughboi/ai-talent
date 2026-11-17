"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import { signInAction, signUpAction } from "@/actions/auth";
import { Field, Input } from "@/components/ui";
import { FormError, SubmitButton } from "@/components/form";
import { cn } from "@/lib/utils";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="link font-medium text-ink">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ defaultRole, next }: { defaultRole: "company" | "operator"; next?: string }) {
  const [state, action] = useActionState(signUpAction, undefined);
  const [role, setRole] = useState(defaultRole);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="role" value={role} />
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink-2">I want to</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(
            [
              { v: "company", label: "Hire operators", sub: "For companies", icon: Building2 },
              { v: "operator", label: "Work as an operator", sub: "For AI talent", icon: Sparkles },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={role === o.v}
              onClick={() => setRole(o.v)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all",
                role === o.v ? "border-ink bg-card shadow-lift ring-1 ring-ink" : "border-line bg-card/60 hover:border-line-strong",
              )}
            >
              <o.icon className={cn("size-4", role === o.v ? "text-signal" : "text-muted")} aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-muted">{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Full name" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(fe.name)} />
      </Field>
      {role === "company" && (
        <Field label="Company" htmlFor="companyName" error={fe.companyName}>
          <Input id="companyName" name="companyName" autoComplete="organization" aria-invalid={Boolean(fe.companyName)} />
        </Field>
      )}
      <Field label="Work email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={Boolean(fe.password)} />
      </Field>
      <FormError message={state?.error && !Object.keys(fe).length ? state.error : null} />
      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account…">
        {role === "company" ? "Create company account" : "Start your operator profile"}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="link font-medium text-ink">
          Sign in
        </Link>
      </p>
    </form>
  );
}
