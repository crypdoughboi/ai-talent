"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, Cpu, Info, Sparkles } from "lucide-react";
import type { GeneratedBrief } from "@/lib/brief-engine";
import type { PublicMatch } from "@/lib/public";
import { specName, functionName, industryName } from "@/lib/taxonomy";
import { cn, formatMoney, formatRange } from "@/lib/utils";
import { Avatar } from "./brand";
import { Badge, Chip } from "./ui";

export type BriefResponse = { brief: GeneratedBrief; mode: "ai" | "rules"; notice: string | null; aiConfigured: boolean; matches: PublicMatch[] };

export function EngineBadge({ mode }: { mode: "ai" | "rules" }) {
  return mode === "ai" ? (
    <Badge tone="signal">
      <Sparkles className="size-3" aria-hidden /> AI-generated
    </Badge>
  ) : (
    <Badge tone="info">
      <Cpu className="size-3" aria-hidden /> Rules engine
    </Badge>
  );
}

const STEPS = ["Reading the problem", "Mapping implementation patterns", "Estimating scope and budget", "Matching against operator profiles"];

export function ScopingProgress() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-card" aria-live="polite" aria-busy>
      <ol className="space-y-3">
        {STEPS.map((s, idx) => (
          <li key={s} className={cn("flex items-center gap-3 text-sm transition-opacity duration-300", idx > i ? "opacity-35" : "opacity-100")}>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                idx < i ? "border-ink bg-ink text-paper" : idx === i ? "animate-pulse-dot border-signal bg-signal-soft text-signal-ink" : "border-line text-faint",
              )}
            >
              {idx < i ? "✓" : idx + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-6 space-y-2.5">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}

export function BriefSummary({ data, compact = false, footer }: { data: BriefResponse; compact?: boolean; footer?: React.ReactNode }) {
  const { brief, mode, notice, matches } = data;
  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
      <div className="border-b border-line bg-paper/60 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <EngineBadge mode={mode} />
          {brief.functions.slice(0, 2).map((f) => (
            <Badge key={f}>{functionName(f)}</Badge>
          ))}
          {brief.industry && <Badge tone="outline">{industryName(brief.industry)}</Badge>}
        </div>
        <h3 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight">{brief.title}</h3>
        {notice && <p className="mt-2 text-[12.5px] text-warn">{notice}</p>}
      </div>

      <div className={cn("grid gap-0", !compact && "lg:grid-cols-[1.35fr_1fr]")}>
        <div className="space-y-6 px-6 py-6">
          <BriefBlock n="01" title="Underlying business problem">
            <p className="text-[14.5px] leading-relaxed text-ink-2">{brief.businessProblem}</p>
          </BriefBlock>
          <BriefBlock n="02" title="Implementation approaches">
            <ul className="space-y-3">
              {brief.approaches.map((a) => (
                <li key={a.title} className="rounded-xl border border-line p-3.5">
                  <div className="text-[14px] font-semibold">{a.title}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{a.description}</p>
                  {a.tools.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {a.tools.map((t) => (
                        <Chip key={t} className="text-[11.5px]">{t}</Chip>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </BriefBlock>
          <BriefBlock n="03" title="Specialist capabilities needed">
            <div className="flex flex-wrap gap-1.5">
              {brief.capabilities.map((c) => (
                <Badge key={c} tone="ink">{specName(c)}</Badge>
              ))}
            </div>
          </BriefBlock>
          {!compact && (
            <BriefBlock n="04" title="Recommended milestones">
              <ol className="relative space-y-4 border-l border-line pl-5">
                {brief.milestones.map((m, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-card bg-signal ring-1 ring-line" aria-hidden />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-semibold">{m.title}</span>
                      <span className="tabular shrink-0 font-mono text-[11px] text-muted">{m.weeks} wk</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{m.description}</p>
                  </li>
                ))}
              </ol>
            </BriefBlock>
          )}
        </div>

        <div className={cn("space-y-5 border-line bg-paper/40 px-6 py-6", compact ? "border-t" : "border-t lg:border-l lg:border-t-0")}>
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Indicative budget</span>
              <Badge tone="warn">Estimate</Badge>
            </div>
            <div className="tabular mt-2 text-[26px] font-semibold tracking-tight">{formatRange(brief.budgetMinCents, brief.budgetMaxCents)}</div>
            <div className="mt-1 text-[12.5px] text-muted">
              ~{brief.timelineWeeks} weeks
              {brief.hoursSavedLow != null && brief.hoursSavedHigh != null && (
                <>
                  {" "}· est. {brief.hoursSavedLow}–{brief.hoursSavedHigh} hrs/week recovered
                </>
              )}
            </div>
            <p className="mt-3 flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              Directional range for planning, not a quote. Operators propose their own price and scope.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Relevant operators</span>
              <span className="text-[11.5px] text-muted">From real profiles</span>
            </div>
            {matches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong p-4 text-[13px] leading-relaxed text-muted">
                No listed operator covers this yet. Save the brief and we'll route it to the curation team, who personally recruit for open requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {matches.slice(0, compact ? 3 : 5).map((m) => (
                  <li key={m.operator.id}>
                    <Link href={`/operators/${m.operator.handle}`} target={compact ? undefined : "_blank"} className="group flex items-start gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-line-strong">
                      <Avatar name={m.operator.name} fileId={m.operator.avatarFileId} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-semibold">{m.operator.name}</span>
                          {m.operator.verifiedCount > 0 && <BadgeCheck className="size-3.5 text-ok" aria-label="Verified credentials" />}
                          {m.operator.isSample && <span className="rounded border border-dashed border-line-strong px-1 text-[10px] text-muted">Sample</span>}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-[12px] text-muted">{m.reasons.slice(0, 2).join(" · ")}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-[11px] font-medium", m.strength === "Strong match" ? "text-signal-ink" : "text-muted")}>{m.strength}</div>
                        {m.operator.hourlyRateCents && <div className="tabular text-[11.5px] text-muted">{formatMoney(m.operator.hourlyRateCents)}/hr</div>}
                      </div>
                      <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-faint group-hover:text-ink" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

function BriefBlock({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono text-[11px] text-signal-ink">{n}</span>
        <h4 className="eyebrow !text-ink-2">{title}</h4>
      </div>
      {children}
    </section>
  );
}

export async function requestBrief(problem: string): Promise<BriefResponse> {
  const res = await fetch("/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ problem }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong generating the brief.");
  return json as BriefResponse;
}
