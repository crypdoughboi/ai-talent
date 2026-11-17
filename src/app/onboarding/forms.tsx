"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { addPortfolioAction, addServiceAction, addVerificationAction, saveCapabilitiesAction, saveIdentityAction, saveRatesAction, submitForReviewAction } from "@/actions/operator";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import { AVAILABILITY, EXPERIENCE_LEVELS, FUNCTIONS, INDUSTRIES, SPECIALIZATIONS, TOOLS, VERIFICATION_KINDS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/forms";

type Op = {
  name: string; handle: string; headline: string; bio: string; location: string; timezone: string;
  links: { label: string; url: string }[]; specializations: string[]; functions: string[]; industries: string[]; tools: string[];
  experienceLevel: string; yearsExperience: number | null; hourlyRateCents: number | null; minProjectCents: number | null;
  availability: string; hoursPerWeek: number | null;
};

function fe(state: FormState, k: string) {
  return state?.fieldErrors?.[k];
}

export function IdentityForm({ op }: { op: Op }) {
  const [state, action] = useActionState(saveIdentityAction, undefined);
  const [headline, setHeadline] = useState(op.headline);
  const link = (label: string) => op.links.find((l) => l.label === label)?.url ?? "";
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={fe(state, "name")}>
          <Input id="name" name="name" defaultValue={op.name} required />
        </Field>
        <Field label="Profile handle" htmlFor="handle" error={fe(state, "handle")} hint={`operators.work/operators/${op.handle}`}>
          <Input id="handle" name="handle" defaultValue={op.handle} required />
        </Field>
      </div>
      <Field label="Headline" htmlFor="headline" error={fe(state, "headline")} hint={`${headline.length}/110 · Lead with the outcome you create, e.g. “Turning contract review into a 10-minute job”.`}>
        <Input id="headline" name="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={110} required />
      </Field>
      <Field label="Bio" htmlFor="bio" error={fe(state, "bio")} hint="How you got here, what you build, how you work with clients. Plain language beats buzzwords.">
        <Textarea id="bio" name="bio" defaultValue={op.bio} rows={6} maxLength={2000} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Location" htmlFor="location" error={fe(state, "location")}>
          <Input id="location" name="location" defaultValue={op.location} placeholder="City, country" required />
        </Field>
        <Field label="Time zone" htmlFor="timezone" optional>
          <Input id="timezone" name="timezone" defaultValue={op.timezone} placeholder="e.g. ET, CET" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="LinkedIn" htmlFor="linkedin" optional>
          <Input id="linkedin" name="linkedin" defaultValue={link("LinkedIn")} placeholder="https://" />
        </Field>
        <Field label="GitHub" htmlFor="github" optional>
          <Input id="github" name="github" defaultValue={link("GitHub")} placeholder="https://" />
        </Field>
        <Field label="Website" htmlFor="website" optional>
          <Input id="website" name="website" defaultValue={link("Website")} placeholder="https://" />
        </Field>
      </div>
      <Field label="Profile photo" htmlFor="avatar" optional error={fe(state, "avatar")} hint="PNG, JPEG, or WebP under 1 MB. We'll use a monogram if you skip it.">
        <Input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-paper-2 file:px-3 file:py-1 file:text-[13px]" />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Saving…">Save & continue</SubmitButton>
    </form>
  );
}

function ChipGroup({ name, options, selected, max, legend, error }: { name: string; options: readonly { slug: string; name: string }[]; selected: string[]; max?: number; legend: string; error?: string }) {
  const [sel, setSel] = useState(selected);
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-ink-2">
        {legend} {max && <span className="font-normal text-faint">· up to {max}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = sel.includes(o.slug);
          return (
            <label
              key={o.slug}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal",
                on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={o.slug}
                checked={on}
                className="sr-only"
                onChange={() => setSel((s) => (on ? s.filter((x) => x !== o.slug) : max && s.length >= max ? s : [...s, o.slug]))}
              />
              {o.name}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-[12.5px] text-bad">{error}</p>}
    </fieldset>
  );
}

export function CapabilitiesForm({ op }: { op: Op }) {
  const [state, action] = useActionState(saveCapabilitiesAction, undefined);
  const known = new Set<string>(TOOLS);
  const other = op.tools.filter((t) => !known.has(t));
  return (
    <form action={action} className="space-y-7">
      <ChipGroup name="specializations" legend="Specializations" options={SPECIALIZATIONS} selected={op.specializations} max={5} error={fe(state, "specializations")} />
      <ChipGroup name="functions" legend="Business functions you've transformed" options={FUNCTIONS} selected={op.functions} max={5} error={fe(state, "functions")} />
      <ChipGroup name="industries" legend="Industries" options={INDUSTRIES} selected={op.industries} max={6} />
      <ChipGroup name="tools" legend="Tool stack" options={TOOLS.map((t) => ({ slug: t, name: t }))} selected={op.tools.filter((t) => known.has(t))} error={fe(state, "tools")} />
      <Field label="Other tools" htmlFor="otherTools" optional hint="Comma separated.">
        <Input id="otherTools" name="otherTools" defaultValue={other.join(", ")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Experience level" htmlFor="experienceLevel">
          <Select id="experienceLevel" name="experienceLevel" defaultValue={op.experienceLevel}>
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}: {l.description}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Years building with automation or AI" htmlFor="yearsExperience">
          <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={50} defaultValue={op.yearsExperience ?? ""} />
        </Field>
      </div>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Saving…">Save & continue</SubmitButton>
    </form>
  );
}

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function PortfolioForm() {
  const [state, action] = useActionState(addPortfolioAction, undefined);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project title" htmlFor="title" error={fe(state, "title")}>
          <Input id="title" name="title" required placeholder="Invoice inbox to QuickBooks pipeline" />
        </Field>
        <Field label="One-line summary" htmlFor="summary" optional>
          <Input id="summary" name="summary" maxLength={200} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Problem" htmlFor="problem" error={fe(state, "problem")}>
          <Textarea id="problem" name="problem" rows={3} className="min-h-24" placeholder="What was slow, expensive, or broken?" />
        </Field>
        <Field label="What you built" htmlFor="solution" error={fe(state, "solution")}>
          <Textarea id="solution" name="solution" rows={3} className="min-h-24" placeholder="Architecture, tools, how humans stay in the loop." />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Demo or write-up link" htmlFor="demoUrl" optional error={fe(state, "demoUrl")}>
          <Input id="demoUrl" name="demoUrl" placeholder="https://" />
        </Field>
        <Field label="Tools used" htmlFor="ptools" optional hint="Comma separated.">
          <Input id="ptools" name="tools" placeholder="Claude, n8n, Postgres" />
        </Field>
      </div>
      <fieldset className="rounded-xl border border-dashed border-line-strong p-4">
        <legend className="px-1 text-[13px] font-medium text-ink-2">Quantified outcome</legend>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Input name="metricLabel" aria-label="Metric" placeholder="Metric, e.g. Hours spent keying invoices / week" />
          <Input name="metricBefore" aria-label="Before" placeholder="Before: 30" />
          <Input name="metricAfter" aria-label="After" placeholder="After: 6" />
        </div>
        <p className="mt-2 text-[12px] text-muted">Shown as self-reported unless backed by a verified credential.</p>
      </fieldset>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <FormSuccess message={state?.message} />
      <SubmitButton variant="secondary" pendingLabel="Adding…">Add project</SubmitButton>
    </form>
  );
}

export function RatesForm({ op }: { op: Op }) {
  const [state, action] = useActionState(saveRatesAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hourly rate (USD)" htmlFor="hourlyRate" error={fe(state, "hourlyRateCents")} hint="Shown on your profile. Fixed-price services are priced separately.">
          <Input id="hourlyRate" name="hourlyRate" inputMode="decimal" defaultValue={op.hourlyRateCents ? op.hourlyRateCents / 100 : ""} required />
        </Field>
        <Field label="Minimum project (USD)" htmlFor="minProject" optional>
          <Input id="minProject" name="minProject" inputMode="decimal" defaultValue={op.minProjectCents ? op.minProjectCents / 100 : ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Availability" htmlFor="availability">
          <Select id="availability" name="availability" defaultValue={op.availability}>
            {AVAILABILITY.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hours per week for client work" htmlFor="hoursPerWeek">
          <Input id="hoursPerWeek" name="hoursPerWeek" type="number" min={1} max={60} defaultValue={op.hoursPerWeek ?? 20} />
        </Field>
      </div>
      <p className="rounded-xl bg-paper-2 px-4 py-3 text-[13px] text-ink-2">Operators keep 85% of every payment. The 15% platform fee covers matching, payments, and support.</p>
      <FormError message={state?.error} />
      <SubmitButton pendingLabel="Saving…">Save & continue</SubmitButton>
    </form>
  );
}

export function ServiceForm({ packages }: { packages: { id: string; title: string; startingPriceCents: number; deliverables: string[]; scope: string; timelineMaxWeeks: number }[] }) {
  const [state, action] = useActionState(addServiceAction, undefined);
  const ref = useResetOnSuccess(state);
  const [pkgId, setPkgId] = useState("");
  const pkg = packages.find((p) => p.id === pkgId);
  return (
    <form ref={ref} action={action} className="space-y-4" key={pkgId}>
      <Field label="Based on a catalog package" htmlFor="packageId" optional hint="Linking a package lists you on that package's page.">
        <Select id="packageId" name="packageId" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
          <option value="">Custom service</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Service name" htmlFor="stitle" error={fe(state, "title")}>
          <Input id="stitle" name="title" defaultValue={pkg?.title ?? ""} required />
        </Field>
        <Field label="Price (USD)" htmlFor="price" error={fe(state, "priceCents")}>
          <Input id="price" name="price" inputMode="decimal" defaultValue={pkg ? pkg.startingPriceCents / 100 : ""} required />
        </Field>
        <Field label="Timeline (days)" htmlFor="timelineDays" error={fe(state, "timelineDays")}>
          <Input id="timelineDays" name="timelineDays" type="number" min={3} max={180} defaultValue={pkg ? pkg.timelineMaxWeeks * 7 : ""} required />
        </Field>
      </div>
      <Field label="Scope" htmlFor="sdesc" error={fe(state, "description")}>
        <Textarea id="sdesc" name="description" rows={3} className="min-h-20" defaultValue={pkg?.scope ?? ""} />
      </Field>
      <Field label="Deliverables" htmlFor="deliverables" error={fe(state, "deliverables")} hint="One per line.">
        <Textarea id="deliverables" name="deliverables" rows={4} defaultValue={pkg?.deliverables.join("\n") ?? ""} />
      </Field>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <FormSuccess message={state?.message} />
      <SubmitButton variant="secondary" pendingLabel="Adding…">Add service</SubmitButton>
    </form>
  );
}

export function VerificationForm() {
  const [state, action] = useActionState(addVerificationAction, undefined);
  const ref = useResetOnSuccess(state);
  const [kind, setKind] = useState("deployment");
  const hint = VERIFICATION_KINDS.find((k) => k.slug === kind)?.hint;
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label="Evidence type" htmlFor="kind">
          <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {VERIFICATION_KINDS.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What should we verify?" htmlFor="vtitle" error={fe(state, "title")}>
          <Input id="vtitle" name="title" placeholder="Production support-triage system for a SaaS company" required />
        </Field>
      </div>
      <Field label="Evidence link" htmlFor="evidenceUrl" error={fe(state, "evidenceUrl")} hint={hint} optional={kind === "reference"}>
        <Input id="evidenceUrl" name="evidenceUrl" placeholder="https://" />
      </Field>
      <Field label="Details for the reviewer" htmlFor="details" error={fe(state, "details")} hint="Only admins see this. For references, include the contact's name, role, and email.">
        <Textarea id="details" name="details" rows={3} className="min-h-20" />
      </Field>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <FormSuccess message={state?.message} />
      <SubmitButton variant="secondary" pendingLabel="Submitting…">Submit evidence</SubmitButton>
    </form>
  );
}

export function SubmitReviewForm({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(submitForReviewAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state?.error} />
      <FormSuccess message={state?.message} />
      <SubmitButton size="lg" variant="signal" disabled={disabled} pendingLabel="Submitting…">
        Submit profile for review
      </SubmitButton>
    </form>
  );
}
