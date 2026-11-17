"use client";

import { useActionState } from "react";
import { changePasswordAction, updateCompanyAction } from "@/actions/account";
import { Field, Input, Select } from "@/components/ui";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import { COMPANY_SIZES, INDUSTRIES } from "@/lib/taxonomy";

export function CompanyForm({ company }: { company: { name: string; website: string | null; size: string | null; industry: string | null } }) {
  const [state, action] = useActionState(updateCompanyAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Company name" htmlFor="c-name">
        <Input id="c-name" name="name" defaultValue={company.name} required />
      </Field>
      <Field label="Website" htmlFor="c-web" optional>
        <Input id="c-web" name="website" defaultValue={company.website ?? ""} placeholder="https://" />
      </Field>
      <Field label="Size" htmlFor="c-size" optional>
        <Select id="c-size" name="size" defaultValue={company.size ?? ""}>
          <option value="">Select</option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>{s} people</option>
          ))}
        </Select>
      </Field>
      <Field label="Industry" htmlFor="c-ind" optional>
        <Select id="c-ind" name="industry" defaultValue={company.industry ?? ""}>
          <option value="">Select</option>
          {INDUSTRIES.map((i) => (
            <option key={i.slug} value={i.slug}>{i.name}</option>
          ))}
        </Select>
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={state?.error} />
        <FormSuccess message={state?.message} />
        <SubmitButton variant="secondary" pendingLabel="Saving…">Save company</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Current password" htmlFor="pw-cur">
        <Input id="pw-cur" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="pw-new" hint="At least 10 characters.">
        <Input id="pw-new" name="next" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={state?.error} />
        <SubmitButton variant="secondary" pendingLabel="Updating…">Change password</SubmitButton>
      </div>
    </form>
  );
}
