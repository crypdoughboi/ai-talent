import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowUpRight, BadgeCheck, Check, Clock, ExternalLink, Trash2, X } from "lucide-react";
import { requireUser, getOperatorForUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { STEPS, stepStatus, type StepSlug } from "@/lib/onboarding";
import { VERIFICATION_KINDS, specName } from "@/lib/taxonomy";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { AvailabilityDot } from "@/components/cards";
import { Badge, ButtonLink, Card, Chip, Notice, Progress, Section } from "@/components/ui";
import { deletePortfolioAction, toggleServiceAction, withdrawVerificationAction } from "@/actions/operator";
import { CapabilitiesForm, IdentityForm, PortfolioForm, RatesForm, ServiceForm, SubmitReviewForm, VerificationForm } from "./forms";

export const metadata: Metadata = { title: "Operator onboarding" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op) redirect("/dashboard");
  const { step: rawStep } = await searchParams;
  const step = (STEPS.find((s) => s.slug === rawStep)?.slug ?? "identity") as StepSlug;

  const [portfolio, services, verifications, packages] = await Promise.all([
    db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.operatorId, op.id)).orderBy(asc(schema.portfolioItems.sortOrder)),
    db.select().from(schema.services).where(eq(schema.services.operatorId, op.id)),
    db.select().from(schema.verifications).where(eq(schema.verifications.operatorId, op.id)).orderBy(desc(schema.verifications.createdAt)),
    db.select().from(schema.packages).where(eq(schema.packages.active, true)).orderBy(asc(schema.packages.sortOrder)),
  ]);
  const st = stepStatus(op, { portfolio: portfolio.length, services: services.length, verifications: verifications.length });
  const idx = STEPS.findIndex((s) => s.slug === step);
  const next = STEPS[idx + 1];
  const current = STEPS[idx];

  return (
    <Section className="py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">Operator profile · {op.status === "draft" ? "Draft" : op.status === "pending" ? "In review" : op.status}</div>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight sm:text-[36px]">Build a profile you&rsquo;re proud to share</h1>
        </div>
        <div className="w-full max-w-xs">
          <div className="mb-1.5 flex justify-between text-[12.5px]">
            <span className="text-muted">Profile strength</span>
            <span className="tabular font-semibold">{st.pct}%</span>
          </div>
          <Progress value={st.pct} label="Profile completeness" />
        </div>
      </div>

      {op.status === "rejected" && op.statusNote && (
        <Notice tone="bad" title="Your application needs changes" className="mb-6">
          {op.statusNote}
        </Notice>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr_300px]">
        <nav aria-label="Onboarding steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {STEPS.map((s, i) => {
              const done = st.steps[s.slug];
              const active = s.slug === step;
              return (
                <li key={s.slug} className="shrink-0">
                  <Link
                    href={`/onboarding?step=${s.slug}`}
                    aria-current={active ? "step" : undefined}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", active ? "bg-card shadow-card ring-1 ring-line" : "hover:bg-card/60")}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
                        done ? "border-ok bg-ok text-white" : active ? "border-ink text-ink" : "border-line-strong text-faint",
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-[13.5px] font-medium", !active && !done && "text-ink-2")}>{s.title}</span>
                      <span className="hidden text-[11.5px] text-muted lg:block">{s.blurb}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <Card className="min-w-0 p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Step {idx + 1} of {STEPS.length}</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{current.title}</h2>
            </div>
            {next && step !== "identity" && step !== "capabilities" && step !== "rates" && (
              <ButtonLink href={`/onboarding?step=${next.slug}`} variant="ghost" size="sm">
                {step === "services" || step === "verification" ? "Skip for now" : "Next"} →
              </ButtonLink>
            )}
          </div>

          {step === "identity" && <IdentityForm op={op} />}
          {step === "capabilities" && <CapabilitiesForm op={op} />}
          {step === "rates" && <RatesForm op={op} />}

          {step === "portfolio" && (
            <div className="space-y-8">
              <p className="text-[14px] text-muted">Show working systems, not slide decks. The best profiles include a demo link and one quantified outcome per project.</p>
              {portfolio.length > 0 && (
                <ul className="space-y-2">
                  {portfolio.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-4">
                      <div className="min-w-0">
                        <div className="font-semibold">{p.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {p.metrics[0] ? `${p.metrics[0].label}: ${p.metrics[0].before} → ${p.metrics[0].after}` : "No metric yet"}
                          {p.demoUrl && " · has demo"}
                        </div>
                      </div>
                      <form action={deletePortfolioAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="rounded-lg p-1.5 text-faint hover:bg-paper hover:text-bad" aria-label={`Delete ${p.title}`}>
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <PortfolioForm />
              {portfolio.length > 0 && <ButtonLink href="/onboarding?step=rates">Continue →</ButtonLink>}
            </div>
          )}

          {step === "services" && (
            <div className="space-y-8">
              <p className="text-[14px] text-muted">Productized services let companies buy an outcome at a fixed price. Base one on a catalog package to appear on that package&rsquo;s page.</p>
              {services.length > 0 && (
                <ul className="space-y-2">
                  {services.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
                      <div className="min-w-0">
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-[12.5px] text-muted">
                          {formatMoney(s.priceCents)} · {s.timelineDays} days · {s.active ? "Active" : "Paused"}
                        </div>
                      </div>
                      <form action={toggleServiceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="rounded-full border border-line px-3 py-1 text-[12.5px] font-medium hover:border-line-strong">{s.active ? "Pause" : "Activate"}</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <ServiceForm packages={packages} />
              <ButtonLink href="/onboarding?step=verification" variant={services.length ? "primary" : "ghost"}>Continue →</ButtonLink>
            </div>
          )}

          {step === "verification" && (
            <div className="space-y-8">
              <p className="text-[14px] text-muted">
                Badges are earned, never self-assigned. An admin reviews each item; approved items appear on your profile as <strong>verified</strong>. Everything else is shown as self-reported.
              </p>
              {verifications.length > 0 && (
                <ul className="space-y-2">
                  {verifications.map((v) => (
                    <li key={v.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{v.title}</span>
                          {v.status === "approved" && <Badge tone="ok"><BadgeCheck className="size-3" /> Verified</Badge>}
                          {v.status === "pending" && <Badge tone="warn"><Clock className="size-3" /> In review</Badge>}
                          {v.status === "rejected" && <Badge tone="bad"><X className="size-3" /> Not verified</Badge>}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-muted">{VERIFICATION_KINDS.find((k) => k.slug === v.kind)?.name}</div>
                        {v.reviewNote && <div className="mt-1.5 text-[12.5px] text-ink-2">Reviewer: {v.reviewNote}</div>}
                      </div>
                      {v.status === "pending" && (
                        <form action={withdrawVerificationAction}>
                          <input type="hidden" name="id" value={v.id} />
                          <button className="text-[12.5px] text-muted hover:text-bad">Withdraw</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <VerificationForm />
              <ButtonLink href="/onboarding?step=submit">Continue →</ButtonLink>
            </div>
          )}

          {step === "submit" && (
            <div className="space-y-6">
              <ul className="space-y-2">
                {STEPS.filter((s) => s.slug !== "submit").map((s) => {
                  const required = ["identity", "capabilities", "portfolio", "rates"].includes(s.slug);
                  return (
                    <li key={s.slug} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                      <span className="flex items-center gap-2.5 text-[14px]">
                        {st.steps[s.slug] ? <Check className="size-4 text-ok" /> : <span className="size-4 rounded-full border border-line-strong" />}
                        {s.title}
                        {!required && <span className="text-[12px] text-faint">Recommended</span>}
                      </span>
                      {!st.steps[s.slug] && (
                        <Link href={`/onboarding?step=${s.slug}`} className="text-[13px] font-medium text-ink-2 hover:text-ink">
                          Complete →
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {op.status === "pending" ? (
                <Notice tone="info" title="Your profile is in review">A person on our team reviews every application, usually within 3 business days. You can keep editing meanwhile.</Notice>
              ) : op.status === "approved" ? (
                <Notice tone="ok" title="You're live">
                  Your profile is public. <Link className="link" href={`/operators/${op.handle}`}>View it</Link> and share it.
                </Notice>
              ) : (
                <>
                  <p className="text-[14px] text-muted">When you submit, a person reviews your profile. You&rsquo;ll appear in discovery and matching once approved.</p>
                  <SubmitReviewForm disabled={!st.canSubmit} />
                  {!st.canSubmit && <p className="text-[12.5px] text-muted">Required: {st.missing.join(", ")}.</p>}
                </>
              )}
            </div>
          )}
        </Card>

        {/* Live preview */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="eyebrow mb-3">Live preview</div>
          <div className="rounded-2xl border border-line bg-card p-5 shadow-lift">
            <div className="flex items-start gap-3">
              <Avatar name={op.name} fileId={op.avatarFileId} size={48} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{op.name}</div>
                <div className="truncate text-[12.5px] text-muted">{op.location || "Location"}</div>
              </div>
            </div>
            <p className="mt-4 line-clamp-3 text-[14px] leading-snug text-ink-2">{op.headline || <span className="text-faint">Your headline appears here</span>}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {op.specializations.length ? op.specializations.slice(0, 3).map((s) => <Chip key={s}>{specName(s)}</Chip>) : <Chip className="text-faint">Specializations</Chip>}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <AvailabilityDot value={op.availability} />
              <span className="tabular text-[13px] font-medium">{op.hourlyRateCents ? `${formatMoney(op.hourlyRateCents)}/hr` : "Rate"}</span>
            </div>
          </div>
          <Link href={`/operators/${op.handle}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
            Open full profile <ArrowUpRight className="size-3.5" />
          </Link>
          {portfolio.some((p) => p.demoUrl) && (
            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ok">
              <ExternalLink className="size-3" /> Demo links let reviewers and clients see your work directly.
            </p>
          )}
        </aside>
      </div>
    </Section>
  );
}
