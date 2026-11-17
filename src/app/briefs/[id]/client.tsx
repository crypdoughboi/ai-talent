"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { inviteFromBriefAction, updateBriefAction } from "@/actions/briefs";
import { submitProposalAction } from "@/actions/engagements";
import { Button, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import { formatMoney } from "@/lib/utils";

export function InviteButton({ briefId, operatorId, disabled, disabledLabel }: { briefId: string; operatorId: string; disabled?: boolean; disabledLabel?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (disabled) return <span className="text-[12px] text-muted">{disabledLabel}</span>;
  if (done)
    return (
      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ok">
        <Check className="size-3.5" /> Invited
      </span>
    );
  return (
    <div className="text-right">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await inviteFromBriefAction(briefId, operatorId);
            if (res.ok) setDone(true);
            else setError(res.error ?? "Couldn't invite");
          })
        }
      >
        {pending ? "Inviting…" : "Invite"}
      </Button>
      {error && <p className="mt-1 max-w-48 text-[11.5px] text-bad">{error}</p>}
    </div>
  );
}

export function EditBriefForm({ brief }: { brief: { id: string; title: string; businessProblem: string; budgetMinCents: number; budgetMaxCents: number; timelineWeeks: number; visibility: string } }) {
  const [state, action] = useActionState(updateBriefAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="briefId" value={brief.id} />
      <Field label="Title" htmlFor="e-title">
        <Input id="e-title" name="title" defaultValue={brief.title} maxLength={120} />
      </Field>
      <Field label="Business problem" htmlFor="e-bp">
        <Textarea id="e-bp" name="businessProblem" defaultValue={brief.businessProblem} rows={4} maxLength={2000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Budget low (USD)" htmlFor="e-min">
          <Input id="e-min" name="budgetMin" type="number" min={500} step={500} defaultValue={brief.budgetMinCents / 100} />
        </Field>
        <Field label="Budget high (USD)" htmlFor="e-max">
          <Input id="e-max" name="budgetMax" type="number" min={500} step={500} defaultValue={brief.budgetMaxCents / 100} />
        </Field>
        <Field label="Timeline (weeks)" htmlFor="e-wk">
          <Input id="e-wk" name="timelineWeeks" type="number" min={1} max={52} defaultValue={brief.timelineWeeks} />
        </Field>
      </div>
      <Field label="Visibility" htmlFor="e-vis">
        <Select id="e-vis" name="visibility" defaultValue={brief.visibility}>
          <option value="network">Approved operator network can view and propose</option>
          <option value="invite_only">Only invited operators</option>
        </Select>
      </Field>
      <FormError message={state?.error} />
      <FormSuccess message={state?.message} />
      <SubmitButton variant="secondary" pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}

type M = { title: string; description: string; amount: string; days: string };

export function ProposalForm({ briefId, initial, budgetHint, feeBps }: { briefId: string; initial: M[]; budgetHint: string; feeBps: number }) {
  const [state, action] = useActionState(submitProposalAction, undefined);
  const [ms, setMs] = useState<M[]>(initial);
  const total = ms.reduce((s, m) => s + (Number(m.amount.replace(/[$,]/g, "")) || 0), 0);
  const days = ms.reduce((s, m) => s + (Number(m.days) || 0), 0);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="briefId" value={briefId} />
      <Field label="Note to the client" htmlFor="coverNote" error={fe.coverNote} hint="Why you, in a few sentences. Reference similar work you've shipped.">
        <Textarea id="coverNote" name="coverNote" rows={4} maxLength={3000} />
      </Field>
      <Field label="Approach" htmlFor="approach" error={fe.approach} hint="How you'll solve it, what you'll need from them, and how you'll measure success.">
        <Textarea id="approach" name="approach" rows={5} maxLength={4000} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink-2">Milestones · fixed price</legend>
        <div className="space-y-2">
          {ms.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_120px_90px_auto]">
              <div className="space-y-1.5">
                <Input name="mTitle" aria-label={`Milestone ${i + 1} title`} value={m.title} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="h-9" />
                <Input name="mDesc" aria-label={`Milestone ${i + 1} description`} value={m.description} placeholder="What's delivered" onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className="h-9 text-[13px]" />
              </div>
              <label className="text-[11.5px] text-muted">
                Amount (USD)
                <Input name="mAmount" inputMode="decimal" value={m.amount} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className="mt-1 h-9" />
              </label>
              <label className="text-[11.5px] text-muted">
                Days
                <Input name="mDays" type="number" min={1} max={180} value={m.days} onChange={(e) => setMs(ms.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)))} className="mt-1 h-9" />
              </label>
              <button type="button" aria-label={`Remove milestone ${i + 1}`} disabled={ms.length <= 1} onClick={() => setMs(ms.filter((_, j) => j !== i))} className="self-center rounded-lg p-1.5 text-faint hover:text-bad disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setMs([...ms, { title: "", description: "", amount: "", days: "7" }].slice(0, 8))} className={buttonClass("ghost", "sm", "mt-2")}>
          <Plus className="size-3.5" /> Add milestone
        </button>
        {fe.milestones && <p className="mt-1 text-[12.5px] text-bad">{fe.milestones}</p>}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper-2 px-4 py-3">
        <div>
          <div className="text-[12px] text-muted">Total · {days} days</div>
          <div className="tabular text-xl font-semibold">{formatMoney(Math.round(total * 100))}</div>
        </div>
        <div className="text-right text-[12px] text-muted">
          Client estimate: {budgetHint}
          <br />
          You receive {formatMoney(Math.round(total * (10000 - feeBps) / 100))} after the {feeBps / 100}% platform fee
        </div>
      </div>
      <Field label="Projected time saved (hrs/week)" htmlFor="phs" optional hint="Your honest projection. Documented impact is confirmed by the client after delivery.">
        <Input id="phs" name="projectedHoursSaved" type="number" min={0} max={2000} className="max-w-40" />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton variant="signal" size="lg" pendingLabel="Sending…">
        Send proposal
      </SubmitButton>
    </form>
  );
}
