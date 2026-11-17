"use client";

import { useActionState } from "react";
import { joinWaitlistAction } from "@/actions/growth";
import { Input } from "@/components/ui";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";

export function WaitlistForm({ kind }: { kind: "company" | "operator" }) {
  const [state, action] = useActionState(joinWaitlistAction, undefined);
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`wl-${kind}`} className="sr-only">Email</label>
        <Input id={`wl-${kind}`} name="email" type="email" required placeholder="you@company.com" className="flex-1" />
        <SubmitButton variant="secondary" pendingLabel="Joining…">Join the list</SubmitButton>
      </div>
      <Input name="interest" aria-label="What are you interested in?" placeholder={kind === "operator" ? "Your specialty (optional)" : "What do you need help with? (optional)"} maxLength={200} />
      <FormError message={state?.error} />
    </form>
  );
}
