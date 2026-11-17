import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Check, Clock, Inbox, Lock, Package, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBriefForUser } from "@/lib/access";
import { db, schema } from "@/lib/db";
import { getListedOperators, hydrateStats } from "@/lib/queries";
import { rankOperators } from "@/lib/matching";
import { config } from "@/lib/config";
import { specName, functionName } from "@/lib/taxonomy";
import { formatDate, formatMoney, formatRange, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { Badge, ButtonLink, Card, EmptyState, Notice, Section } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { acceptProposalAction, acceptServiceRequestAction, declineInvitationAction, declineProposalAction, withdrawProposalAction } from "@/actions/engagements";
import { setBriefStatusAction } from "@/actions/briefs";
import { EditBriefForm, InviteButton, ProposalForm } from "./client";

export const metadata: Metadata = { title: "Brief" };

const STATUS_TONE = { draft: "neutral", open: "ok", hired: "signal", closed: "outline" } as const;

export default async function BriefPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const access = await getBriefForUser(user, id);
  if (!access) notFound();
  const { brief, company } = access;

  const [proposals, invitations, engagement] = await Promise.all([
    db.select().from(schema.proposals).where(eq(schema.proposals.briefId, id)).orderBy(desc(schema.proposals.createdAt)),
    db.select().from(schema.invitations).where(eq(schema.invitations.briefId, id)),
    db.select({ id: schema.engagements.id }).from(schema.engagements).where(eq(schema.engagements.briefId, id)).limit(1),
  ]);
  const opIds = [...new Set([...proposals.map((p) => p.operatorId), ...invitations.map((i) => i.operatorId)])];
  const opRows = opIds.length ? await hydrateStats(await db.select().from(schema.operators).where(inArray(schema.operators.id, opIds))) : [];
  const opById = new Map(opRows.map((o) => [o.id, o]));

  const header = (
    <div className="border-b border-line bg-card/40">
      <Section className="py-10">
        <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink">← Dashboard</Link>
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[brief.status]} dot>{brief.status === "open" ? "Open for proposals" : brief.status === "hired" ? "Hired" : brief.status}</Badge>
              <Badge tone="outline">{brief.visibility === "network" ? <><Users className="size-3" /> Network</> : <><Lock className="size-3" /> Invite only</>}</Badge>
              {brief.generatedBy === "package" && <Badge tone="info"><Package className="size-3" /> Package request</Badge>}
              {brief.functions.map((f) => <Badge key={f}>{functionName(f)}</Badge>)}
            </div>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">{brief.title}</h1>
            <p className="mt-2 text-sm text-muted">{company.name} · posted {formatDate(brief.createdAt)}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="eyebrow">{brief.generatedBy === "package" ? "Fixed price" : "Budget estimate"}</div>
              <div className="tabular mt-1 text-xl font-semibold">{brief.budgetMinCents === brief.budgetMaxCents ? formatMoney(brief.budgetMinCents) : formatRange(brief.budgetMinCents, brief.budgetMaxCents)}</div>
            </div>
            <div>
              <div className="eyebrow">Timeline</div>
              <div className="tabular mt-1 text-xl font-semibold">{brief.timelineWeeks} wk</div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );

  const details = (
    <Card className="space-y-6 p-6">
      <div>
        <div className="eyebrow mb-2">In their words</div>
        <p className="text-[14.5px] italic leading-relaxed text-ink-2">“{brief.problemStatement}”</p>
      </div>
      <div>
        <div className="eyebrow mb-2">Business problem</div>
        <p className="text-[14.5px] leading-relaxed text-ink-2">{brief.businessProblem}</p>
      </div>
      <div>
        <div className="eyebrow mb-2">Approaches</div>
        <ul className="space-y-2">
          {brief.approaches.map((a) => (
            <li key={a.title} className="rounded-xl border border-line p-3.5">
              <div className="text-[14px] font-semibold">{a.title}</div>
              <p className="mt-1 text-[13px] text-muted">{a.description}</p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="eyebrow mb-2">Capabilities</div>
        <div className="flex flex-wrap gap-1.5">{brief.capabilities.map((c) => <Badge key={c} tone="ink">{specName(c)}</Badge>)}</div>
      </div>
      <div>
        <div className="eyebrow mb-2">Milestones</div>
        <ol className="space-y-2">
          {brief.milestones.map((m, i) => (
            <li key={i} className="flex gap-3 text-[13.5px]">
              <span className="font-mono text-[11px] text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1"><span className="font-medium">{m.title}</span> <span className="text-muted">· {m.weeks} wk</span><br /><span className="text-muted">{m.description}</span></span>
            </li>
          ))}
        </ol>
      </div>
      {brief.assumptions.length > 0 && (
        <ul className="space-y-1 border-t border-line pt-4 text-[12.5px] text-muted">
          {brief.assumptions.map((a) => <li key={a}>· {a}</li>)}
        </ul>
      )}
    </Card>
  );

  /* ───────── Operator view ───────── */
  if (access.side === "operator") {
    const op = access.operator!;
    const mine = proposals.filter((p) => p.operatorId === op.id);
    const active = mine.find((p) => p.status === "submitted" || p.status === "accepted");
    const inv = access.invitation;
    const mid = (brief.budgetMinCents + brief.budgetMaxCents) / 2;
    const totalWeeks = brief.milestones.reduce((s, m) => s + m.weeks, 0) || 1;
    const initial = brief.milestones.map((m) => ({ title: m.title, description: m.description.slice(0, 160), amount: String(Math.round((mid * (m.weeks / totalWeeks)) / 10000) * 100), days: String(m.weeks * 7) }));
    return (
      <>
        {header}
        <Section className="grid gap-8 py-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            {inv?.message && (
              <Card className="p-5">
                <div className="eyebrow mb-2">Message from {company.name}</div>
                <p className="whitespace-pre-line text-[14px] text-ink-2">{inv.message}</p>
              </Card>
            )}
            {details}
          </div>
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {sp.proposed && <Notice tone="ok" title="Proposal sent">The client has been notified. You&rsquo;ll see their decision here and in Messages.</Notice>}
            {engagement[0] && active?.status === "accepted" ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold">You&rsquo;re hired</h2>
                <p className="mt-1 text-sm text-muted">The project workspace is ready.</p>
                <ButtonLink href={`/projects/${engagement[0].id}`} className="mt-4">Open project <ArrowRight className="size-4" /></ButtonLink>
              </Card>
            ) : active ? (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your proposal</h2>
                  <Badge tone="warn"><Clock className="size-3" /> Awaiting decision</Badge>
                </div>
                <div className="tabular mt-3 text-2xl font-semibold">{formatMoney(active.totalCents)}</div>
                <div className="text-sm text-muted">{active.timelineDays} days · {active.milestones.length} milestones · sent {timeAgo(active.createdAt)}</div>
                <form action={withdrawProposalAction} className="mt-4">
                  <input type="hidden" name="proposalId" value={active.id} />
                  <SubmitButton variant="secondary" size="sm">Withdraw</SubmitButton>
                </form>
              </Card>
            ) : brief.status !== "open" ? (
              <EmptyState title="This brief is closed" description="It's no longer accepting proposals." />
            ) : op.status !== "approved" ? (
              <Notice tone="warn" title="Approval required">Your profile must be approved before you can send proposals.</Notice>
            ) : inv?.serviceId && inv.status === "invited" ? (
              <Card className="p-6">
                <Badge tone="info"><Package className="size-3" /> Package request</Badge>
                <h2 className="mt-3 text-lg font-semibold">Accept at your listed price?</h2>
                <p className="mt-1 text-sm text-muted">{company.name} requested your service at {formatMoney(brief.budgetMinCents)}. Accepting creates the project; they fund the first milestone to start.</p>
                <div className="mt-5 flex gap-2">
                  <form action={acceptServiceRequestAction}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <SubmitButton variant="signal" pendingLabel="Accepting…">Accept request</SubmitButton>
                  </form>
                  <form action={declineInvitationAction}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <SubmitButton variant="secondary">Decline</SubmitButton>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Send a proposal</h2>
                    <p className="text-sm text-muted">Pre-filled from the brief. Make it yours.</p>
                  </div>
                  {inv?.status === "invited" && (
                    <form action={declineInvitationAction}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button className="text-[12.5px] text-muted hover:text-bad">Decline invite</button>
                    </form>
                  )}
                </div>
                <ProposalForm briefId={brief.id} initial={initial} budgetHint={formatRange(brief.budgetMinCents, brief.budgetMaxCents)} feeBps={config.platformFeeBps} />
              </Card>
            )}
          </div>
        </Section>
      </>
    );
  }

  /* ───────── Company / admin view ───────── */
  const isCompany = access.side === "company";
  const invitedIds = new Set(invitations.map((i) => i.operatorId));
  const suggestions = isCompany && brief.status === "open" ? rankOperators((await getListedOperators()).filter((o) => !invitedIds.has(o.id)), brief, 4) : [];
  const live = proposals.filter((p) => p.status !== "withdrawn");

  return (
    <>
      {header}
      <Section className="grid gap-8 py-10 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0 space-y-8">
          {sp.saved && <Notice tone="ok" title="Brief saved">{invitations.length ? "Invitations sent. Operators will reply with proposals here." : "Invite operators below, or wait for proposals from the network."}</Notice>}
          {sp.requested && <Notice tone="ok" title="Package requested">The operator will confirm the scope. Once they accept, you&rsquo;ll fund the first milestone to start.</Notice>}
          {engagement[0] && (
            <Notice tone="signal" title="You hired an operator for this brief">
              <Link href={`/projects/${engagement[0].id}`} className="link font-medium">Open the project workspace →</Link>
            </Notice>
          )}

          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Proposals</h2>
              <span className="text-sm text-muted">{live.length} received</span>
            </div>
            {live.length === 0 ? (
              <EmptyState icon={<Inbox className="size-5" />} title="No proposals yet" description={brief.status === "open" ? "Invited operators typically respond within two business days. Invite a few more to compare options." : "This brief isn't accepting proposals."} />
            ) : (
              <div className="space-y-4">
                {live.map((p) => {
                  const op = opById.get(p.operatorId);
                  if (!op) return null;
                  return (
                    <Card key={p.id} className="overflow-hidden">
                      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Avatar name={op.name} fileId={op.avatarFileId} size={44} />
                          <div>
                            <Link href={`/operators/${op.handle}`} className="flex items-center gap-1.5 font-semibold hover:underline">
                              {op.name} {op.verifiedCount > 0 && <BadgeCheck className="size-4 text-ok" aria-label="Verified credentials" />}
                            </Link>
                            <div className="text-[12.5px] text-muted">{op.headline}</div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="tabular text-2xl font-semibold tracking-tight">{formatMoney(p.totalCents)}</div>
                          <div className="text-[12.5px] text-muted">{p.timelineDays} days · {p.milestones.length} milestones</div>
                        </div>
                      </div>
                      <div className="grid gap-5 p-5 md:grid-cols-2">
                        <div>
                          <div className="eyebrow mb-1.5">Note</div>
                          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{p.coverNote}</p>
                          <div className="eyebrow mb-1.5 mt-4">Approach</div>
                          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{p.approach}</p>
                          {p.projectedHoursSaved != null && <p className="mt-3 text-[13px]"><span className="text-muted">Projected impact:</span> <strong>{p.projectedHoursSaved} hrs/week</strong></p>}
                        </div>
                        <ol className="space-y-2">
                          {p.milestones.map((m, i) => (
                            <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-paper px-3 py-2.5 text-[13px]">
                              <span><span className="font-medium">{m.title}</span><br /><span className="text-muted">{m.days} days{m.description ? ` · ${m.description}` : ""}</span></span>
                              <span className="tabular shrink-0 font-semibold">{formatMoney(m.amountCents)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/50 px-5 py-3.5">
                        <span className="text-[12.5px] text-muted">Received {timeAgo(p.createdAt)}</span>
                        {p.status === "submitted" && isCompany && brief.status === "open" ? (
                          <div className="flex gap-2">
                            <form action={declineProposalAction}>
                              <input type="hidden" name="proposalId" value={p.id} />
                              <SubmitButton variant="ghost" size="sm">Decline</SubmitButton>
                            </form>
                            <form action={acceptProposalAction}>
                              <input type="hidden" name="proposalId" value={p.id} />
                              <SubmitButton size="sm" pendingLabel="Accepting…">Accept & create project</SubmitButton>
                            </form>
                          </div>
                        ) : (
                          <Badge tone={p.status === "accepted" ? "ok" : "outline"}>{p.status === "accepted" ? <><Check className="size-3" /> Accepted</> : p.status}</Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {invitations.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">Invited</h2>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                {invitations.map((i) => {
                  const op = opById.get(i.operatorId);
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="flex items-center gap-2.5 text-[14px]">
                        {op && <Avatar name={op.name} fileId={op.avatarFileId} size={28} />}
                        {op?.name}
                      </span>
                      <Badge tone={i.status === "declined" ? "bad" : i.status === "invited" ? "warn" : "ok"}>{i.status === "invited" ? "Awaiting reply" : i.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {suggestions.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold tracking-tight">Suggested operators</h2>
              <p className="mb-3 text-sm text-muted">Ranked on this brief&rsquo;s capabilities, function, and budget.</p>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                {suggestions.map((m) => (
                  <li key={m.operator.id} className="flex items-start gap-3 p-4">
                    <Avatar name={m.operator.name} fileId={m.operator.avatarFileId} size={36} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/operators/${m.operator.handle}`} className="text-[14px] font-semibold hover:underline">{m.operator.name}</Link>
                      <div className="mt-0.5 text-[12px] text-muted">{m.strength} · {m.reasons.slice(0, 2).join(" · ")}</div>
                    </div>
                    <InviteButton briefId={brief.id} operatorId={m.operator.id} disabled={m.operator.isSample} disabledLabel="Sample listing" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {details}
          {isCompany && brief.status !== "hired" && (
            <Card className="p-6">
              <details>
                <summary className="cursor-pointer text-[15px] font-semibold">Edit brief</summary>
                <div className="mt-5">
                  <EditBriefForm brief={brief} />
                </div>
              </details>
              <form action={setBriefStatusAction} className="mt-5 border-t border-line pt-4">
                <input type="hidden" name="briefId" value={brief.id} />
                <input type="hidden" name="status" value={brief.status === "open" ? "closed" : "open"} />
                <SubmitButton variant={brief.status === "open" ? "danger" : "secondary"} size="sm">{brief.status === "open" ? "Close brief" : "Reopen brief"}</SubmitButton>
              </form>
            </Card>
          )}
        </aside>
      </Section>
    </>
  );
}
