"use client";

import { useActionState, useState } from "react";
import { inviteOperatorAction, requestServiceAction } from "@/actions/briefs";
import { Field, Select, Textarea } from "./ui";
import { FormError, FormSuccess, SubmitButton } from "./form";

export function InviteForm({ operatorId, operatorName, briefs }: { operatorId: string; operatorName: string; briefs: { id: string; title: string }[] }) {
  const [state, action] = useActionState(inviteOperatorAction, undefined);
  const [briefId, setBriefId] = useState(briefs[0]?.id ?? "__new");
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="operatorId" value={operatorId} />
      <Field label="Project" htmlFor="briefId">
        <Select id="briefId" name="briefId" value={briefId} onChange={(e) => setBriefId(e.target.value)}>
          {briefs.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
          <option value="__new">New project…</option>
        </Select>
      </Field>
      {briefId === "__new" && (
        <Field label="What do you need done?" htmlFor="description" hint="We'll scope it into a brief you can edit later.">
          <Textarea id="description" name="description" rows={3} placeholder="e.g. Automate first-pass review of our vendor contracts" className="min-h-20" />
        </Field>
      )}
      <Field label={`Note to ${operatorName.split(" ")[0]}`} htmlFor="message" optional>
        <Textarea id="message" name="message" rows={3} className="min-h-20" placeholder="Context, timing, anything they should know." />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Request a proposal
      </SubmitButton>
    </form>
  );
}

export function ServiceRequestForm({ serviceId, inputs }: { serviceId: string; inputs: string[] }) {
  const [state, action] = useActionState(requestServiceAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="serviceId" value={serviceId} />
      <Field
        label="Your context"
        htmlFor={`ctx-${serviceId}`}
        hint={inputs.length ? `The operator will need: ${inputs.join("; ")}.` : "Describe your team, tools, and what success looks like."}
      >
        <Textarea id={`ctx-${serviceId}`} name="context" rows={3} className="min-h-24" placeholder="Team size, tools you use today, what success looks like…" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton className="w-full" variant="signal" pendingLabel="Sending request…">
        Request at this price
      </SubmitButton>
      <p className="text-center text-[11.5px] text-muted">The operator confirms scope before anything is charged.</p>
    </form>
  );
}
