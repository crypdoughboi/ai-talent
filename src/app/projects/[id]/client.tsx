"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Star } from "lucide-react";
import { documentImpactAction, draftCaseStudyAction, leaveReviewAction, sendMessageAction, submitDeliverableAction, uploadFileAction } from "@/actions/engagements";
import { Field, Input, Textarea } from "@/components/ui";
import { FormError, FormSuccess, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

function useReset(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function MessageComposer({ threadId, engagementId }: { threadId: string; engagementId?: string }) {
  const [state, action] = useActionState(sendMessageAction, undefined);
  const ref = useReset(state);
  return (
    <form ref={ref} action={action} className="flex items-end gap-2">
      <input type="hidden" name="threadId" value={threadId} />
      {engagementId && <input type="hidden" name="engagementId" value={engagementId} />}
      <label htmlFor={`msg-${threadId}`} className="sr-only">
        Message
      </label>
      <Textarea
        id={`msg-${threadId}`}
        name="body"
        rows={2}
        maxLength={8000}
        placeholder="Write a message…"
        className="min-h-12 flex-1 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement).requestSubmit();
        }}
      />
      <SubmitButton size="md" className="size-11 shrink-0 !px-0" aria-label="Send message">
        <Send className="size-4" />
      </SubmitButton>
      {state?.error && <p className="sr-only" role="alert">{state.error}</p>}
    </form>
  );
}

export function FileUpload({ engagementId }: { engagementId: string }) {
  const [state, action] = useActionState(uploadFileAction, undefined);
  const ref = useReset(state);
  const [name, setName] = useState("");
  return (
    <form ref={ref} action={action} className="space-y-2" onSubmit={() => setName("")}>
      <input type="hidden" name="engagementId" value={engagementId} />
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted hover:border-ink hover:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal">
        <Paperclip className="size-4" />
        <span className="flex-1 truncate">{name || "Choose a file (max 5 MB)"}</span>
        <input type="file" name="file" className="sr-only" onChange={(e) => setName(e.target.files?.[0]?.name ?? "")} />
      </label>
      {name && <SubmitButton size="sm" variant="secondary" pendingLabel="Uploading…">Upload & share</SubmitButton>}
      <FormError message={state?.error} />
      <FormSuccess message={state?.message} />
    </form>
  );
}

export function DeliverableForm({ engagementId, milestoneId }: { engagementId: string; milestoneId: string }) {
  const [state, action] = useActionState(submitDeliverableAction, undefined);
  const fe = state?.fieldErrors ?? {};
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-paper/60 p-4">
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <Field label="What are you delivering?" htmlFor={`note-${milestoneId}`} error={fe.note}>
        <Textarea id={`note-${milestoneId}`} name="note" rows={3} className="min-h-20 bg-card" placeholder="Summary, how to test it, known limitations." />
      </Field>
      <Field label="Link" htmlFor={`url-${milestoneId}`} optional error={fe.url}>
        <Input id={`url-${milestoneId}`} name="url" placeholder="https:// (demo, repo, Loom, doc)" className="bg-card" />
      </Field>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <SubmitButton size="sm" pendingLabel="Submitting…">Submit for review</SubmitButton>
    </form>
  );
}

export function ImpactForm({ engagementId, current }: { engagementId: string; current: { hoursPerWeek: number | null; note: string } | null }) {
  const [state, action] = useActionState(documentImpactAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="engagementId" value={engagementId} />
      <Field label="Measured hours saved per week" htmlFor="impact-h" error={fe.hoursPerWeek}>
        <Input id="impact-h" name="hoursPerWeek" type="number" min={0} max={2000} defaultValue={current?.hoursPerWeek ?? ""} className="max-w-40" />
      </Field>
      <Field label="How was it measured?" htmlFor="impact-n" error={fe.note}>
        <Textarea id="impact-n" name="note" rows={3} className="min-h-20" defaultValue={current?.note ?? ""} placeholder="Baseline vs. two weeks after launch, from ticket timestamps…" />
      </Field>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <FormSuccess message={state?.message} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">Send to client for confirmation</SubmitButton>
    </form>
  );
}

export function ReviewForm({ engagementId, operatorName }: { engagementId: string; operatorName: string }) {
  const [state, action] = useActionState(leaveReviewAction, undefined);
  const [rating, setRating] = useState(0);
  const fe = state?.fieldErrors ?? {};
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink-2">How did {operatorName.split(" ")[0]} do?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} onClick={() => setRating(n)} className="rounded p-0.5">
              <Star className={cn("size-6 transition-colors", n <= rating ? "fill-signal text-signal" : "text-line-strong hover:text-signal")} />
            </button>
          ))}
        </div>
        {fe.rating && <p className="mt-1 text-[12.5px] text-bad">{fe.rating}</p>}
      </fieldset>
      <Field label="Review" htmlFor="rev-body" error={fe.body}>
        <Textarea id="rev-body" name="body" rows={4} placeholder="What did they build, and what changed for your team?" />
      </Field>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="showCompany" value="1" className="size-4 accent-[#131311]" /> Show my name and company on the review
      </label>
      <FormError message={state?.error && !state.fieldErrors ? state.error : null} />
      <SubmitButton size="sm" pendingLabel="Posting…">Post review</SubmitButton>
    </form>
  );
}

export function CaseStudyForm({ engagementId, defaults }: { engagementId: string; defaults: { title: string; clientLabel: string } }) {
  const [state, action] = useActionState(draftCaseStudyAction, undefined);
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="engagementId" value={engagementId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Headline" htmlFor="cs-title">
          <Input id="cs-title" name="title" defaultValue={defaults.title} maxLength={120} />
        </Field>
        <Field label="How to describe the client" htmlFor="cs-client" hint="Anonymize if they prefer.">
          <Input id="cs-client" name="clientLabel" defaultValue={defaults.clientLabel} maxLength={120} />
        </Field>
      </div>
      <Field label="Summary" htmlFor="cs-summary">
        <Textarea id="cs-summary" name="summary" rows={2} className="min-h-16" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Before (one per line)" htmlFor="cs-before">
          <Textarea id="cs-before" name="before" rows={4} />
        </Field>
        <Field label="After (one per line)" htmlFor="cs-after">
          <Textarea id="cs-after" name="after" rows={4} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <Input name="metricLabel" aria-label="Metric" placeholder="Headline metric" />
        <Input name="metricBefore" aria-label="Before value" placeholder="Before" />
        <Input name="metricAfter" aria-label="After value" placeholder="After" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton size="sm" variant="secondary" pendingLabel="Sending…">Send to client for approval</SubmitButton>
    </form>
  );
}

export function RevisionToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <>{children}</>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-medium text-ink-2 hover:text-ink">
      Request changes
    </button>
  );
}
