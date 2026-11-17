"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createDiagnosticAction } from "@/actions/growth";
import { MATURITY, PRIORITIES, SYSTEMS, TASKS } from "@/lib/diagnostic";
import { COMPANY_SIZES, FUNCTIONS, INDUSTRIES } from "@/lib/taxonomy";
import { Field, Input, Progress, Select, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEP_TITLES = ["About your company", "Where the time goes", "Recurring work", "Your AI starting point", "What matters most"];

export function DiagnosticWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyLabel, setCompanyLabel] = useState("");
  const [size, setSize] = useState<string>("11–50");
  const [industry, setIndustry] = useState<string>("");
  const [hours, setHours] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<string[]>([]);
  const [maturity, setMaturity] = useState<string>("experimenting");
  const [systems, setSystems] = useState<string[]>([]);
  const [priority, setPriority] = useState<string>("time");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canNext = step === 2 ? tasks.length > 0 : true;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await createDiagnosticAction({
      companyLabel,
      size,
      industry: industry || null,
      functionHours: Object.entries(hours).map(([fn, h]) => ({ fn, hours: h })),
      tasks,
      maturity,
      systems,
      priority,
    });
    if (res.ok) router.push(`/report/${res.id}?new=1`);
    else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-line bg-card shadow-lift">
      <div className="border-b border-line px-6 py-5 sm:px-8">
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span className="eyebrow">Step {step + 1} of {STEP_TITLES.length}</span>
          <span>{STEP_TITLES[step]}</span>
        </div>
        <Progress value={((step + 1) / STEP_TITLES.length) * 100} className="mt-3" label="Diagnostic progress" />
      </div>

      <div key={step} className="min-h-[340px] animate-rise px-6 py-7 sm:px-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Tell us about your company</h2>
            <Field label="Company name" htmlFor="d-company" optional hint="Shown on your shareable report. Leave blank to keep it anonymous.">
              <Input id="d-company" value={companyLabel} maxLength={80} onChange={(e) => setCompanyLabel(e.target.value)} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-ink-2">Team size</legend>
              <div className="flex flex-wrap gap-2">
                {COMPANY_SIZES.map((s) => (
                  <Pill key={s} on={size === s} onClick={() => setSize(s)} role="radio">{s}</Pill>
                ))}
              </div>
            </fieldset>
            <Field label="Industry" htmlFor="d-ind" optional>
              <Select id="d-ind" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Select an industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.slug} value={i.slug}>{i.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Where does repetitive work pile up?</h2>
              <p className="mt-1 text-sm text-muted">Select teams and estimate weekly hours spent on repetitive, manual work across the whole team. Rough is fine.</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {FUNCTIONS.map((f) => {
                const on = f.slug in hours;
                return (
                  <li key={f.slug} className={cn("rounded-xl border p-3.5 transition-colors", on ? "border-ink bg-paper/60" : "border-line")}>
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <span className="text-[14px] font-medium">{f.name}</span>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setHours((h) => {
                          const n = { ...h };
                          if (on) delete n[f.slug];
                          else n[f.slug] = 10;
                          return n;
                        })}
                        className="size-4 accent-[#131311]"
                      />
                    </label>
                    {on && (
                      <div className="mt-3 flex items-center gap-3">
                        <input type="range" min={1} max={120} value={hours[f.slug]} aria-label={`${f.name} hours per week`} onChange={(e) => setHours((h) => ({ ...h, [f.slug]: Number(e.target.value) }))} className="flex-1 accent-[#ff4f00]" />
                        <span className="tabular w-16 text-right text-[13px] font-semibold">{hours[f.slug]} h/wk</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-[12.5px] text-muted">Skip this if you&rsquo;re unsure. We&rsquo;ll use a conservative baseline and label it as assumed.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Which of these happen every week?</h2>
              <p className="mt-1 text-sm text-muted">Pick everything that applies.</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {TASKS.map((t) => {
                const on = tasks.includes(t.id);
                return (
                  <li key={t.id}>
                    <button type="button" aria-pressed={on} onClick={() => setTasks((x) => toggle(x, t.id))} className={cn("flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-[14px] transition-colors", on ? "border-ink bg-ink text-paper" : "border-line hover:border-line-strong")}>
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-signal bg-signal text-ink" : "border-line-strong")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                      {t.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Where are you with AI today?</h2>
            <fieldset>
              <legend className="sr-only">AI maturity</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {MATURITY.map((m) => (
                  <Pill key={m.id} on={maturity === m.id} onClick={() => setMaturity(m.id)} role="radio" block>{m.label}</Pill>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-ink-2">Systems you rely on</legend>
              <div className="flex flex-wrap gap-2">
                {SYSTEMS.map((s) => (
                  <Pill key={s} on={systems.includes(s)} onClick={() => setSystems((x) => toggle(x, s))}>{s}</Pill>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">What matters most this year?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRIORITIES.map((p) => (
                <Pill key={p.id} on={priority === p.id} onClick={() => setPriority(p.id)} role="radio" block>{p.label}</Pill>
              ))}
            </div>
            <p className="text-[12.5px] text-muted">Your report gets a shareable link. It contains only the answers above, never documents or contact details.</p>
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line px-6 py-4 sm:px-8">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={buttonClass("ghost", "md", "disabled:invisible")}>
          <ArrowLeft className="size-4" /> Back
        </button>
        {step < STEP_TITLES.length - 1 ? (
          <button type="button" onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className={buttonClass("primary")}>
            Continue <ArrowRight className="size-4" />
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={busy} className={buttonClass("signal")}>
            {busy ? "Building your report…" : "Get my report"} <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({ on, onClick, children, role, block }: { on: boolean; onClick: () => void; children: React.ReactNode; role?: "radio"; block?: boolean }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
        block && "w-full text-left",
        on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}
