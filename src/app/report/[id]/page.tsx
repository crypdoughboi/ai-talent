import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { db, schema } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import type { DiagnosticAnswers, DiagnosticReport } from "@/lib/diagnostic";
import { MATURITY, PRIORITIES } from "@/lib/diagnostic";
import { getListedOperators } from "@/lib/queries";
import { rankOperators } from "@/lib/matching";
import { industryName, specName } from "@/lib/taxonomy";
import { formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, Notice, Section } from "@/components/ui";
import { OperatorCard } from "@/components/cards";
import { ShareButtons } from "@/components/share";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const rows = await db.select().from(schema.diagnostics).where(eq(schema.diagnostics.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load((await params).id);
  if (!d) return { title: "Report" };
  const r = d.report as unknown as DiagnosticReport;
  return {
    title: `AI Opportunity Report: ${d.companyLabel}`,
    description: `${r.summary.hoursLow}–${r.summary.hoursHigh} hours/week of potential time savings identified. ${r.summary.headline}`,
    robots: { index: false },
  };
}

export default async function ReportPage({ params, searchParams }: Params & { searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const d = await load(id);
  if (!d) notFound();
  await db.update(schema.diagnostics).set({ views: sql`${schema.diagnostics.views} + 1` }).where(eq(schema.diagnostics.id, id));
  const r = d.report as unknown as DiagnosticReport;
  const a = d.answers as unknown as DiagnosticAnswers;
  const user = await getUser();
  const top = r.opportunities[0];
  const ops = top ? rankOperators(await getListedOperators(), { capabilities: [...new Set(r.opportunities.slice(0, 2).flatMap((o) => o.capabilities))], functions: top.functions, industry: a.industry, tools: [], budgetMaxCents: 2_000_000 }, 3) : [];
  const shareBase = `${config.appUrl}/report/${id}`;
  const shareUrl = user ? `${config.appUrl}/r/${user.referralCode}?to=/report/${id}` : shareBase;

  return (
    <>
      <div className="relative overflow-hidden border-b border-line bg-ink text-paper">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.1] invert" aria-hidden />
        <Section className="relative py-12 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="eyebrow !text-paper/60">AI Opportunity Report · {formatDate(d.createdAt)}</span>
            <ShareButtons url={shareUrl} text={`Our AI Opportunity Report: ${r.summary.hoursLow}–${r.summary.hoursHigh} hrs/week of potential time savings.`} kind="report" />
          </div>
          <h1 className="mt-8 max-w-3xl text-[36px] font-semibold leading-[1.04] tracking-tight sm:text-[56px]">{d.companyLabel}</h1>
          <p className="mt-3 text-[15px] text-paper/70">
            {a.size} people{a.industry ? ` · ${industryName(a.industry)}` : ""} · {MATURITY.find((m) => m.id === a.maturity)?.label} · Priority: {PRIORITIES.find((p) => p.id === a.priority)?.label.toLowerCase()}
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-paper/15 sm:grid-cols-3">
            <div className="bg-ink p-6">
              <div className="eyebrow !text-paper/50">Recoverable time</div>
              <div className="tabular mt-2 text-[40px] font-semibold leading-none tracking-tight">{r.summary.hoursLow}–{r.summary.hoursHigh}<span className="text-lg text-paper/60"> h/wk</span></div>
            </div>
            <div className="bg-ink p-6">
              <div className="eyebrow !text-paper/50">Equivalent capacity</div>
              <div className="tabular mt-2 text-[40px] font-semibold leading-none tracking-tight">{r.summary.fteLow}–{r.summary.fteHigh}<span className="text-lg text-paper/60"> FTE</span></div>
            </div>
            <div className="bg-ink p-6">
              <div className="eyebrow !text-paper/50">Opportunity level</div>
              <div className="mt-2 text-[40px] font-semibold leading-none tracking-tight text-signal">{r.summary.level}</div>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-lg text-paper/85">{r.summary.headline}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-paper/55"><Info className="size-3.5" /> Directional estimates. See assumptions below.</p>
        </Section>
      </div>

      <Section className="grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          {isNew && <Notice tone="ok" title="Your report is ready">Bookmark or share the link. {user ? "" : "Create a free account to turn any opportunity into a brief and invite operators."}</Notice>}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Prioritized opportunities</h2>
            <ol className="space-y-3">
              {r.opportunities.map((o, i) => (
                <li key={o.id}>
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <span className="tabular font-mono text-[12px] text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <h3 className="text-[16px] font-semibold tracking-tight">{o.title}</h3>
                          <div className="tabular shrink-0 text-[15px] font-semibold">{o.hoursLow}–{o.hoursHigh} h/wk</div>
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{o.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Badge tone={o.effort === "Low" ? "ok" : "warn"}>{o.effort} effort</Badge>
                          <Badge>Value in {o.timeToValue}</Badge>
                          {o.assumedBaseline && <Badge tone="outline" className="border-dashed">Assumed baseline</Badge>}
                          {o.capabilities.map((c) => <Badge key={c} tone="outline">{specName(c)}</Badge>)}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-medium">
                          <Link href={`/match?q=${encodeURIComponent(`${o.title}. ${o.description} We are a ${a.size} person company${a.industry ? ` in ${industryName(a.industry).toLowerCase()}` : ""} and want to start here.`)}`} className="inline-flex items-center gap-1 hover:underline">
                            Turn into a brief <ArrowRight className="size-3.5" />
                          </Link>
                          {o.packageSlug && (
                            <Link href={`/services/${o.packageSlug}`} className="inline-flex items-center gap-1 text-muted hover:text-ink hover:underline">
                              See the package <ArrowUpRight className="size-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Your 90-day roadmap</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {r.roadmap.map((p) => (
                <Card key={p.phase} className="p-5">
                  <div className="eyebrow">{p.phase}</div>
                  <ul className="mt-3 space-y-2">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-2 text-[13.5px] leading-snug text-ink-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" /> {it}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Readiness</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">{r.maturityAdvice}</p>
          </section>

          <section className="rounded-2xl border border-dashed border-line-strong p-5">
            <h2 className="eyebrow mb-3">Assumptions & method</h2>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted">
              {r.assumptions.map((x) => <li key={x}>· {x}</li>)}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight">Act on #1 this month</h2>
            <p className="mt-1 text-[13.5px] text-muted">{top ? `Get a scoped brief for “${top.title.toLowerCase()}” and proposals from vetted operators.` : "Describe your workflow to get a scoped brief."}</p>
            <ButtonLink href={top ? `/match?q=${encodeURIComponent(`${top.title}. ${top.description}`)}` : "/match"} variant="signal" className="mt-4 w-full">
              Scope it with AI Match <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/diagnostic" variant="ghost" className="mt-2 w-full">Run another diagnostic</ButtonLink>
          </Card>
          {ops.length > 0 && (
            <div>
              <div className="eyebrow mb-3">Operators who fit your top opportunities</div>
              <div className="space-y-3">
                {ops.map((m) => <OperatorCard key={m.operator.id} op={m.operator} reasons={m.reasons} />)}
              </div>
            </div>
          )}
        </aside>
      </Section>
    </>
  );
}
