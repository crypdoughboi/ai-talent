"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Check, Cpu, Info, Lock, Plus, RefreshCw, Sparkles, Trash2, Users } from "lucide-react";
import { requestBrief, ScopingProgress, EngineBadge, type BriefResponse } from "@/components/brief-result";
import { EXAMPLES } from "@/components/problem-composer";
import { Avatar } from "@/components/brand";
import { Badge, buttonClass, Field, Input, Notice, Textarea } from "@/components/ui";
import { saveBriefAction } from "@/actions/briefs";
import type { GeneratedBrief } from "@/lib/brief-engine";
import type { PublicMatch } from "@/lib/public";
import { SPECIALIZATIONS, specName, functionName, industryName } from "@/lib/taxonomy";
import { cn, formatMoney } from "@/lib/utils";

const DRAFT_KEY = "ops:brief";

type Draft = BriefResponse & { selected?: string[]; visibility?: "invite_only" | "network"; message?: string };

export function MatchStudio({ initialProblem, role, aiConfigured }: { initialProblem: string; role: string | null; aiConfigured: boolean }) {
  const router = useRouter();
  const [problem, setProblem] = useState(initialProblem);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BriefResponse | null>(null);
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"invite_only" | "network">("network");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [dirtyMatch, setDirtyMatch] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  const hydrate = useCallback((d: Draft) => {
    setData(d);
    setBrief(d.brief);
    setMatches(d.matches);
    setProblem(d.brief.problemStatement);
    if (d.selected) setSelected(d.selected);
    if (d.visibility) setVisibility(d.visibility);
    if (d.message) setMessage(d.message);
  }, []);

  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (initialProblem.trim().length >= 12) {
      void generate(initialProblem);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) hydrate(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(p: string) {
    if (p.trim().length < 12) {
      setError("Describe the problem in a sentence or two. Mention the team, the tools, and how much time it takes today.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [res] = await Promise.all([requestBrief(p.trim()), new Promise((r) => setTimeout(r, 900))]);
      setData(res);
      setBrief(res.brief);
      setMatches(res.matches);
      setSelected([]);
      setDirtyMatch(false);
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(res));
      } catch {}
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function update(patch: Partial<GeneratedBrief>) {
    setBrief((b) => (b ? { ...b, ...patch } : b));
    if ("capabilities" in patch || "budgetMaxCents" in patch) setDirtyMatch(true);
  }

  async function rematch() {
    if (!brief) return;
    setRematching(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ capabilities: brief.capabilities, functions: brief.functions, industry: brief.industry, tools: brief.tools, budgetMaxCents: brief.budgetMaxCents }),
      });
      const json = await res.json();
      if (res.ok) {
        setMatches(json.matches);
        setSelected((s) => s.filter((id) => json.matches.some((m: PublicMatch) => m.operator.id === id)));
        setDirtyMatch(false);
      }
    } finally {
      setRematching(false);
    }
  }

  function persistDraft() {
    if (!data || !brief) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, brief, matches, selected, visibility, message } satisfies Draft));
    } catch {}
  }

  async function save() {
    if (!brief || !data) return;
    if (role !== "company") {
      persistDraft();
      router.push(role ? "/dashboard?denied=company" : `/signup?next=${encodeURIComponent("/match")}`);
      return;
    }
    setSaving(true);
    setError(null);
    const timelineWeeks = Math.max(1, brief.milestones.reduce((s, m) => s + m.weeks, 0));
    const res = await saveBriefAction({
      title: brief.title,
      problemStatement: brief.problemStatement,
      businessProblem: brief.businessProblem,
      functions: brief.functions,
      industry: brief.industry,
      capabilities: brief.capabilities,
      tools: brief.tools,
      approaches: brief.approaches,
      milestones: brief.milestones,
      assumptions: brief.assumptions,
      budgetMinCents: brief.budgetMinCents,
      budgetMaxCents: brief.budgetMaxCents,
      timelineWeeks,
      hoursSavedLow: brief.hoursSavedLow,
      hoursSavedHigh: brief.hoursSavedHigh,
      generatedBy: data.mode,
      visibility,
      inviteOperatorIds: selected,
      inviteMessage: message,
    });
    if (res.ok) {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/briefs/${res.id}?saved=1`);
    } else {
      setError(res.error);
      setSaving(false);
    }
  }

  function reset() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    setData(null);
    setBrief(null);
    setMatches([]);
    setSelected([]);
  }

  return (
    <div className="mt-10">
      {!brief && (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate(problem);
            }}
            className="rounded-[22px] border border-line-strong bg-card p-2 shadow-lift"
          >
            <label htmlFor="match-problem" className="sr-only">
              Describe your problem
            </label>
            <textarea
              id="match-problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && generate(problem)}
              rows={6}
              maxLength={3000}
              placeholder="We're a 50-person law firm looking to automate document review and client intake…"
              className="block w-full resize-none bg-transparent px-4 py-3.5 text-[16px] leading-relaxed outline-none placeholder:text-faint"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <span className="text-[12px] text-faint">{problem.length}/3000</span>
              <button type="submit" disabled={loading} className={buttonClass("primary")}>
                {loading ? "Scoping…" : "Generate brief"} <ArrowRight className="size-4" />
              </button>
            </div>
          </form>
          <div className="space-y-4">
            <div className="eyebrow">Try an example</div>
            <ul className="space-y-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => {
                      setProblem(ex);
                      generate(ex);
                    }}
                    className="w-full rounded-xl border border-line bg-card/70 px-4 py-3 text-left text-[13.5px] text-ink-2 transition-colors hover:border-line-strong hover:bg-card"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
            <EngineNote aiConfigured={aiConfigured} />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-bad">
          {error}
        </p>
      )}

      <div ref={resultRef} className="scroll-mt-24">
        {loading && (
          <div className="mt-8">
            <ScopingProgress />
          </div>
        )}

        {brief && data && !loading && (
          <div className="grid animate-rise gap-6 lg:grid-cols-[1fr_400px]">
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <EngineBadge mode={data.mode} />
                  {brief.functions.map((f) => (
                    <Badge key={f}>{functionName(f)}</Badge>
                  ))}
                  {brief.industry && <Badge tone="outline">{industryName(brief.industry)}</Badge>}
                </div>
                <button type="button" onClick={reset} className="text-[13px] font-medium text-muted hover:text-ink">
                  Start over
                </button>
              </div>
              {data.notice && <Notice tone="warn">{data.notice}</Notice>}

              <EditCard n="01" title="Brief">
                <Field label="Title" htmlFor="b-title">
                  <Input id="b-title" value={brief.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} />
                </Field>
                <Field label="Your words" htmlFor="b-problem">
                  <Textarea id="b-problem" value={brief.problemStatement} maxLength={2000} rows={2} className="min-h-16" onChange={(e) => update({ problemStatement: e.target.value })} />
                </Field>
                <Field label="Underlying business problem" htmlFor="b-bp">
                  <Textarea id="b-bp" value={brief.businessProblem} maxLength={2000} rows={4} onChange={(e) => update({ businessProblem: e.target.value })} />
                </Field>
              </EditCard>

              <EditCard n="02" title="Possible implementation approaches">
                <ul className="space-y-3">
                  {brief.approaches.map((a, i) => (
                    <li key={i} className="group rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[14.5px] font-semibold">{a.title}</div>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{a.description}</p>
                          {a.tools.length > 0 && <div className="mt-2 text-[12px] text-faint">{a.tools.join(" · ")}</div>}
                        </div>
                        {brief.approaches.length > 1 && (
                          <button type="button" aria-label={`Remove ${a.title}`} onClick={() => update({ approaches: brief.approaches.filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-faint hover:bg-paper hover:text-bad">
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </EditCard>

              <EditCard n="03" title="Specialist capabilities needed" hint="Toggle to refine who we match.">
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => {
                    const on = brief.capabilities.includes(s.slug);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          const next = on ? brief.capabilities.filter((c) => c !== s.slug) : [...brief.capabilities, s.slug].slice(0, 5);
                          if (next.length) update({ capabilities: next });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                          on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong",
                        )}
                      >
                        {on && <Check className="size-3" />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </EditCard>

              <EditCard n="04" title="Recommended milestones">
                <ol className="space-y-2.5">
                  {brief.milestones.map((m, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-2.5 rounded-xl border border-line p-3">
                      <span className="mt-2.5 font-mono text-[11px] text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
                      <div className="space-y-1.5">
                        <Input aria-label={`Milestone ${i + 1} title`} value={m.title} maxLength={120} className="h-9 font-medium" onChange={(e) => update({ milestones: brief.milestones.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                        <Textarea aria-label={`Milestone ${i + 1} description`} value={m.description} maxLength={600} rows={2} className="min-h-14 text-[13px]" onChange={(e) => update({ milestones: brief.milestones.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                      </div>
                      <label className="flex items-center gap-1 text-[12px] text-muted">
                        <Input aria-label={`Milestone ${i + 1} weeks`} type="number" min={1} max={12} value={m.weeks} className="h-9 w-16 px-2 text-center" onChange={(e) => update({ milestones: brief.milestones.map((x, j) => (j === i ? { ...x, weeks: Math.max(1, Math.min(12, Number(e.target.value) || 1)) } : x)) })} />
                        wk
                      </label>
                      <button type="button" aria-label={`Remove milestone ${i + 1}`} disabled={brief.milestones.length <= 1} onClick={() => update({ milestones: brief.milestones.filter((_, j) => j !== i) })} className="mt-1.5 rounded-lg p-1.5 text-faint hover:bg-paper hover:text-bad disabled:opacity-30">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={() => update({ milestones: [...brief.milestones, { title: "New milestone", description: "", weeks: 1 }].slice(0, 8) })} className={buttonClass("ghost", "sm", "mt-1")}>
                  <Plus className="size-3.5" /> Add milestone
                </button>
              </EditCard>

              <EditCard n="05" title="Indicative budget" badge={<Badge tone="warn">Estimate</Badge>}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Low (USD)" htmlFor="b-min">
                    <Input id="b-min" type="number" min={500} step={500} value={Math.round(brief.budgetMinCents / 100)} onChange={(e) => update({ budgetMinCents: Math.max(500, Number(e.target.value) || 0) * 100 })} />
                  </Field>
                  <Field label="High (USD)" htmlFor="b-max">
                    <Input id="b-max" type="number" min={500} step={500} value={Math.round(brief.budgetMaxCents / 100)} onChange={(e) => update({ budgetMaxCents: Math.max(500, Number(e.target.value) || 0) * 100 })} />
                  </Field>
                  <div className="rounded-xl bg-paper px-4 py-3">
                    <div className="text-[12px] text-muted">Timeline</div>
                    <div className="tabular mt-1 text-lg font-semibold">{brief.milestones.reduce((s, m) => s + m.weeks, 0)} weeks</div>
                  </div>
                </div>
                {brief.hoursSavedLow != null && brief.hoursSavedHigh != null && (
                  <p className="text-[13px] text-ink-2">
                    Projected time recovered: <strong className="tabular">{brief.hoursSavedLow}–{brief.hoursSavedHigh} hrs/week</strong>, based on the baseline you described.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {brief.assumptions.map((a) => (
                    <li key={a} className="flex gap-2 text-[12.5px] leading-relaxed text-muted">
                      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
                {brief.questions.length > 0 && (
                  <div className="rounded-xl border border-dashed border-line-strong p-4">
                    <div className="eyebrow mb-2">Questions operators will ask</div>
                    <ul className="list-disc space-y-1 pl-4 text-[13px] text-ink-2">
                      {brief.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </EditCard>
            </div>

            {/* Matches & save */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-line bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <div className="text-[15px] font-semibold">Matched operators</div>
                    <div className="text-[12px] text-muted">Ranked from real profile data</div>
                  </div>
                  <button type="button" onClick={rematch} disabled={rematching} className={buttonClass(dirtyMatch ? "signal" : "ghost", "sm")}>
                    <RefreshCw className={cn("size-3.5", rematching && "animate-spin")} /> {dirtyMatch ? "Update" : "Refresh"}
                  </button>
                </div>
                <ul className="max-h-[440px] divide-y divide-line overflow-y-auto">
                  {matches.length === 0 && (
                    <li className="p-5 text-[13px] leading-relaxed text-muted">
                      No listed operator covers these capabilities yet. Post the brief to the network and our curation team will personally source operators for it.
                    </li>
                  )}
                  {matches.map((m) => {
                    const sel = selected.includes(m.operator.id);
                    const disabled = m.operator.isSample;
                    return (
                      <li key={m.operator.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            aria-label={`Invite ${m.operator.name}`}
                            checked={sel}
                            disabled={disabled}
                            onChange={() => setSelected((s) => (sel ? s.filter((x) => x !== m.operator.id) : [...s, m.operator.id].slice(0, 10)))}
                            className="mt-3 size-4 accent-[#131311] disabled:opacity-30"
                          />
                          <Avatar name={m.operator.name} fileId={m.operator.avatarFileId} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link href={`/operators/${m.operator.handle}`} target="_blank" className="truncate text-[14px] font-semibold hover:underline">
                                {m.operator.name}
                              </Link>
                              {m.operator.verifiedCount > 0 && <BadgeCheck className="size-3.5 text-ok" aria-label="Verified credentials" />}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                              <span className={cn("font-medium", m.strength === "Strong match" ? "text-signal-ink" : "text-muted")}>{m.strength}</span>
                              {m.operator.hourlyRateCents && <span className="text-muted">· {formatMoney(m.operator.hourlyRateCents)}/hr</span>}
                              {m.operator.isSample && <span className="rounded border border-dashed border-line-strong px-1 text-[10px] text-muted">Sample · not invitable</span>}
                            </div>
                            <ul className="mt-2 space-y-1">
                              {m.reasons.slice(0, 3).map((r) => (
                                <li key={r} className="flex gap-1.5 text-[12px] leading-snug text-ink-2">
                                  <Check className="mt-0.5 size-3 shrink-0 text-ok" aria-hidden /> {r}
                                </li>
                              ))}
                              {m.gaps.slice(0, 1).map((g) => (
                                <li key={g} className="flex gap-1.5 text-[12px] leading-snug text-muted">
                                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-warn" aria-hidden /> {g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card">
                <fieldset>
                  <legend className="mb-2 text-[13px] font-medium text-ink-2">Who can see this brief?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { v: "network", label: "Approved network", icon: Users },
                        { v: "invite_only", label: "Invited only", icon: Lock },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        aria-pressed={visibility === o.v}
                        onClick={() => setVisibility(o.v)}
                        className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium", visibility === o.v ? "border-ink ring-1 ring-ink" : "border-line text-ink-2")}
                      >
                        <o.icon className="size-3.5" /> {o.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {selected.length > 0 && (
                  <Field label={`Note to ${selected.length} invited ${selected.length === 1 ? "operator" : "operators"}`} htmlFor="b-msg" optional>
                    <Textarea id="b-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} className="min-h-20" />
                  </Field>
                )}
                <button type="button" onClick={save} disabled={saving} className={buttonClass("signal", "lg", "w-full")}>
                  {saving ? "Saving…" : role === "company" ? (selected.length ? `Save & invite ${selected.length}` : "Save brief") : "Create free account to save"}
                  <ArrowRight className="size-4" />
                </button>
                {role && role !== "company" && <p className="text-center text-[12px] text-muted">Briefs are saved to company accounts. You&rsquo;re signed in as {role}.</p>}
                {!role && <p className="text-center text-[12px] text-muted">Your draft is kept in this browser while you sign up.</p>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCard({ n, title, hint, badge, children }: { n: string; title: string; hint?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-signal-ink">{n}</span>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        </div>
        {badge}
      </div>
      {hint && <p className="-mt-2 text-[12.5px] text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function EngineNote({ aiConfigured }: { aiConfigured: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card/60 p-4 text-[12.5px] leading-relaxed text-muted">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-ink-2">
        {aiConfigured ? <Sparkles className="size-3.5 text-signal" /> : <Cpu className="size-3.5 text-info" />}
        {aiConfigured ? "AI scoping is on" : "Deterministic scoping mode"}
      </div>
      {aiConfigured
        ? "Your description is sent to our AI provider to draft the brief. Never paste confidential documents here. Operator matching always runs on our own ranking over real profiles."
        : "No AI provider is configured, so briefs come from our transparent rules engine built on implementation playbooks. Results are labeled accordingly."}
    </div>
  );
}
