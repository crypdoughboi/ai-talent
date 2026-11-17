import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowUpRight, Check, CircleDollarSign, Clock, Download, ExternalLink, FileText, FlaskConical, Gauge, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getEngagementForUser } from "@/lib/access";
import { db, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { reconcileCheckoutSession } from "@/lib/payments";
import { formatBytes, formatDate, formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { Badge, Card, Notice, Progress, Section, Textarea, type Tone } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ThreadMessages } from "@/components/thread";
import { cancelEngagementAction, confirmImpactAction, deleteFileAction, payMilestoneAction, reviewCaseStudyAction, reviewMilestoneAction } from "@/actions/engagements";
import { CaseStudyForm, DeliverableForm, FileUpload, ImpactForm, MessageComposer, ReviewForm, RevisionToggle } from "./client";

export const metadata: Metadata = { title: "Project workspace" };

const MS_STATUS: Record<string, { label: string; tone: Tone }> = {
  awaiting_payment: { label: "Awaiting funding", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  submitted: { label: "Ready for review", tone: "warn" },
  revision_requested: { label: "Changes requested", tone: "bad" },
  approved: { label: "Approved", tone: "ok" },
};

const ENG_STATUS: Record<string, { label: string; tone: Tone }> = {
  awaiting_payment: { label: "Awaiting first payment", tone: "warn" },
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "outline" },
};

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (sp.checkout === "success" && sp.session_id) await reconcileCheckoutSession(sp.session_id);

  const access = await getEngagementForUser(user, id);
  if (!access) notFound();
  const { engagement: e, company, operator: op, side } = access;

  const [milestones, invoices, files, review, story, companyOwner] = await Promise.all([
    db.select().from(schema.milestones).where(eq(schema.milestones.engagementId, id)).orderBy(asc(schema.milestones.sortOrder)),
    db.select().from(schema.invoices).where(eq(schema.invoices.engagementId, id)).orderBy(desc(schema.invoices.createdAt)),
    db.select({ id: schema.files.id, name: schema.files.name, size: schema.files.size, ownerId: schema.files.ownerId, createdAt: schema.files.createdAt }).from(schema.files).where(and(eq(schema.files.engagementId, id), eq(schema.files.purpose, "project"))).orderBy(desc(schema.files.createdAt)),
    db.select().from(schema.reviews).where(eq(schema.reviews.engagementId, id)).limit(1),
    db.select().from(schema.caseStudies).where(eq(schema.caseStudies.engagementId, id)).limit(1),
    db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, company.ownerId)).limit(1),
  ]);

  if (side !== "admin") {
    await db.update(schema.threads).set(side === "company" ? { companyReadAt: new Date() } : { operatorReadAt: new Date() }).where(eq(schema.threads.id, e.threadId));
  }

  const names: Record<string, string> = {};
  if (companyOwner[0]) names[companyOwner[0].id] = companyOwner[0].name;
  if (op.userId) names[op.userId] = op.name;

  const paid = invoices.filter((i) => i.status === "paid");
  const paidTotal = paid.reduce((s, i) => s + i.amountCents, 0);
  const approved = milestones.filter((m) => m.status === "approved").length;
  const nextToFund = milestones.find((m) => m.status === "awaiting_payment");
  const canFundNext = nextToFund && (milestones.indexOf(nextToFund) === 0 || ["approved", "submitted"].includes(milestones[milestones.indexOf(nextToFund) - 1]!.status));
  const paymentMode = config.stripe.enabled ? "stripe" : config.paymentsSimulation ? "simulated" : "off";
  const isCompany = side === "company";
  const isOperator = side === "operator";
  const closed = e.status === "completed" || e.status === "cancelled";

  return (
    <>
      <div className="border-b border-line bg-card/40">
        <Section className="py-8 sm:py-10">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink">← Dashboard</Link>
          <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ENG_STATUS[e.status].tone} dot>{ENG_STATUS[e.status].label}</Badge>
                <Badge tone="outline">Fixed price · milestones</Badge>
              </div>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">{e.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <span className="font-medium text-ink-2">{company.name}</span>
                <span aria-hidden>↔</span>
                <Link href={`/operators/${op.handle}`} className="inline-flex items-center gap-1.5 font-medium text-ink-2 hover:text-ink">
                  <Avatar name={op.name} fileId={op.avatarFileId} size={20} /> {op.name}
                </Link>
                <span>· started {formatDate(e.startedAt ?? e.createdAt)}</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:w-auto">
              <MiniStat label="Contract" value={formatMoney(e.totalCents)} />
              <MiniStat label="Paid" value={formatMoney(paidTotal)} />
              <MiniStat label="Approved" value={`${approved}/${milestones.length}`} />
            </div>
          </div>
          <Progress value={(approved / Math.max(1, milestones.length)) * 100} className="mt-6" label="Milestones approved" />
        </Section>
      </div>

      <Section className="grid gap-8 py-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-8">
          {sp.accepted && <Notice tone="ok" title="Project created">Fund the first milestone to kick off the work. Each milestone is paid when it starts.</Notice>}
          {sp.checkout === "success" && <Notice tone="ok" title="Payment received">Stripe confirmed the payment. The milestone is now in progress.</Notice>}
          {sp.checkout === "simulated" && <Notice tone="warn" title="Simulated payment recorded" icon={<FlaskConical className="size-4" />}>No money moved. This deployment runs in payment simulation mode for testing.</Notice>}
          {sp.checkout === "cancelled" && <Notice tone="neutral" title="Checkout cancelled">No charge was made. You can fund the milestone whenever you&rsquo;re ready.</Notice>}

          {/* Milestones */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Milestones</h2>
            <ol className="space-y-3">
              {milestones.map((m, i) => {
                const st = MS_STATUS[m.status];
                const fundable = isCompany && !closed && m.id === nextToFund?.id && canFundNext;
                return (
                  <li key={m.id}>
                    <Card className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${m.status === "approved" ? "bg-ok text-white" : "border border-line-strong text-muted"}`}>
                            {m.status === "approved" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold">{m.title}</h3>
                            {m.description && <p className="mt-0.5 text-[13.5px] text-muted">{m.description}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                              <Badge tone={st.tone}>{st.label}</Badge>
                              <span className="inline-flex items-center gap-1"><Clock className="size-3" /> Day {m.dueDays}</span>
                            </div>
                          </div>
                        </div>
                        <div className="tabular shrink-0 text-right font-semibold">{formatMoney(m.amountCents)}</div>
                      </div>

                      {(m.deliverableNote || m.feedback) && (
                        <div className="mt-4 space-y-2 border-t border-line pt-4">
                          {m.deliverableNote && (
                            <div className="rounded-xl bg-paper px-4 py-3">
                              <div className="eyebrow mb-1">Deliverable · {formatDate(m.submittedAt)}</div>
                              <p className="whitespace-pre-line text-[13.5px] text-ink-2">{m.deliverableNote}</p>
                              {m.deliverableUrl && (
                                <a href={m.deliverableUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:underline">
                                  Open deliverable <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          )}
                          {m.feedback && <p className="text-[13px] text-ink-2"><span className="font-medium">Client feedback:</span> {m.feedback}</p>}
                        </div>
                      )}

                      {fundable && (
                        <form action={payMilestoneAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <input type="hidden" name="engagementId" value={e.id} />
                          <input type="hidden" name="milestoneId" value={m.id} />
                          <PaymentModeNote mode={paymentMode} connected={Boolean(op.stripeAccountId)} />
                          {paymentMode !== "off" && (
                            <SubmitButton variant="signal" pendingLabel="Starting checkout…">
                              <CircleDollarSign className="size-4" /> {paymentMode === "simulated" ? "Record simulated payment" : `Pay ${formatMoney(m.amountCents)}`}
                            </SubmitButton>
                          )}
                        </form>
                      )}
                      {isCompany && m.status === "awaiting_payment" && m.id === nextToFund?.id && !canFundNext && !closed && (
                        <p className="mt-3 text-[12.5px] text-muted">Funding opens once the previous milestone is delivered.</p>
                      )}
                      {isOperator && (m.status === "in_progress" || m.status === "revision_requested") && (
                        <div className="mt-4 border-t border-line pt-4">
                          <DeliverableForm engagementId={e.id} milestoneId={m.id} />
                        </div>
                      )}
                      {isCompany && m.status === "submitted" && (
                        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-line pt-4">
                          <RevisionToggle>
                            <form action={reviewMilestoneAction} className="w-full space-y-2 sm:w-96">
                              <input type="hidden" name="engagementId" value={e.id} />
                              <input type="hidden" name="milestoneId" value={m.id} />
                              <input type="hidden" name="decision" value="revise" />
                              <Textarea name="feedback" rows={3} required minLength={5} aria-label="What should change?" placeholder="What should change?" className="min-h-20" />
                              <SubmitButton size="sm" variant="secondary">Send change request</SubmitButton>
                            </form>
                          </RevisionToggle>
                          <form action={reviewMilestoneAction}>
                            <input type="hidden" name="engagementId" value={e.id} />
                            <input type="hidden" name="milestoneId" value={m.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <SubmitButton size="sm" pendingLabel="Approving…"><Check className="size-4" /> Approve deliverable</SubmitButton>
                          </form>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>
            {isCompany && e.status === "awaiting_payment" && paid.length === 0 && (
              <form action={cancelEngagementAction} className="mt-3">
                <input type="hidden" name="engagementId" value={e.id} />
                <SubmitButton variant="ghost" size="sm">Cancel project before it starts</SubmitButton>
              </form>
            )}
          </section>

          {/* Impact */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight"><Gauge className="size-5" /> Business impact</h2>
            <Card className="grid gap-px overflow-hidden bg-line sm:grid-cols-2">
              <div className="bg-card p-5">
                <div className="eyebrow">Projected</div>
                <div className="tabular mt-2 text-[28px] font-semibold tracking-tight">{e.projectedImpact?.hoursPerWeek != null ? `${e.projectedImpact.hoursPerWeek} h/wk` : "Not set"}</div>
                <p className="mt-1 text-[12.5px] text-muted">{e.projectedImpact?.note || "From the accepted proposal."}</p>
              </div>
              <div className="bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Documented</span>
                  {e.documentedImpact && (e.impactConfirmedAt ? <Badge tone="ok">Client-confirmed</Badge> : <Badge tone="warn">Awaiting confirmation</Badge>)}
                </div>
                <div className="tabular mt-2 text-[28px] font-semibold tracking-tight">{e.documentedImpact?.hoursPerWeek != null ? `${e.documentedImpact.hoursPerWeek} h/wk` : "Not yet"}</div>
                <p className="mt-1 text-[12.5px] text-muted">{e.documentedImpact?.note || "Documented by the operator after launch, confirmed by the client."}</p>
                {isCompany && e.documentedImpact && !e.impactConfirmedAt && (
                  <form action={confirmImpactAction} className="mt-3">
                    <input type="hidden" name="engagementId" value={e.id} />
                    <SubmitButton size="sm" variant="secondary">Confirm this is accurate</SubmitButton>
                  </form>
                )}
              </div>
            </Card>
            {isOperator && e.status !== "awaiting_payment" && e.status !== "cancelled" && (
              <Card className="mt-3 p-5">
                <details>
                  <summary className="cursor-pointer text-[14px] font-semibold">{e.documentedImpact ? "Update documented impact" : "Document measured impact"}</summary>
                  <div className="mt-4"><ImpactForm engagementId={e.id} current={e.documentedImpact} /></div>
                </details>
              </Card>
            )}
          </section>

          {/* Completion */}
          {e.status === "completed" && (
            <section className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-semibold">Review</h3>
                {review[0] ? (
                  <p className="mt-2 text-[13.5px] text-ink-2">★ {review[0].rating}/5 · “{review[0].body}”</p>
                ) : isCompany ? (
                  <div className="mt-3"><ReviewForm engagementId={e.id} operatorName={op.name} /></div>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">The client hasn&rsquo;t left a review yet.</p>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold">Before/after story</h3>
                {story[0]?.status === "published" ? (
                  <Link href={`/stories/${story[0].slug}`} className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-medium hover:underline">Published: {story[0].title} <ArrowUpRight className="size-3.5" /></Link>
                ) : story[0]?.status === "pending_client" ? (
                  isCompany ? (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl bg-paper p-3 text-[13px]">
                        <div className="font-semibold">{story[0].title}</div>
                        <div className="text-muted">{story[0].clientLabel}</div>
                        <p className="mt-1">{story[0].summary}</p>
                      </div>
                      <div className="flex gap-2">
                        <form action={reviewCaseStudyAction}><input type="hidden" name="engagementId" value={e.id} /><input type="hidden" name="decision" value="approve" /><SubmitButton size="sm">Approve & publish</SubmitButton></form>
                        <form action={reviewCaseStudyAction}><input type="hidden" name="engagementId" value={e.id} /><input type="hidden" name="decision" value="reject" /><SubmitButton size="sm" variant="secondary">Request changes</SubmitButton></form>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-muted">Waiting for client approval. Nothing is public until they approve.</p>
                  )
                ) : isOperator ? (
                  <div className="mt-3"><CaseStudyForm engagementId={e.id} defaults={{ title: e.title, clientLabel: company.industry ? `${company.industry} company` : "A growing company" }} /></div>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">The operator can draft a story for your approval. It&rsquo;s only published if you approve it.</p>
                )}
              </Card>
            </section>
          )}

          {/* Invoices */}
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted">No invoices yet. One is created when a milestone is funded.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-card">
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead className="border-b border-line text-[11.5px] text-muted">
                    <tr><th className="px-4 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Amount</th><th className="px-4 py-2.5 font-medium">{isOperator ? "Your payout" : "Platform fee"}</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Date</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-3 font-mono text-[12px]">{inv.number}</td>
                        <td className="tabular px-4 py-3">{formatMoney(inv.amountCents)}</td>
                        <td className="tabular px-4 py-3">{formatMoney(isOperator ? inv.payoutCents : inv.platformFeeCents)}</td>
                        <td className="px-4 py-3">
                          <Badge tone={inv.status === "paid" ? "ok" : inv.status === "void" ? "outline" : "warn"}>{inv.status}</Badge>
                          {inv.provider === "simulated" && <Badge tone="outline" className="ml-1 border-dashed">Simulated</Badge>}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(inv.paidAt ?? inv.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: messages + files */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex max-h-[640px] flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-semibold">Messages</h2>
              <Link href={`/messages/${e.threadId}`} className="text-[12.5px] text-muted hover:text-ink">Full view</Link>
            </div>
            <div className="flex flex-1 flex-col-reverse overflow-y-auto px-4 py-3">
              <ThreadMessages threadId={e.threadId} viewerId={user.id} names={names} />
            </div>
            {side !== "admin" && (
              <div className="border-t border-line p-3">
                <MessageComposer threadId={e.threadId} engagementId={e.id} />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 font-semibold">Project files</h2>
            <p className="mb-4 text-[12.5px] text-muted">Private to this project&rsquo;s participants. Files are never sent to an AI provider.</p>
            {files.length > 0 && (
              <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{f.name}</div>
                      <div className="text-[11.5px] text-muted">{formatBytes(f.size)} · {names[f.ownerId]?.split(" ")[0] ?? "Member"} · {formatDate(f.createdAt)}</div>
                    </div>
                    <a href={`/api/files/${f.id}?download=1`} className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label={`Download ${f.name}`}><Download className="size-4" /></a>
                    {f.ownerId === user.id && (
                      <form action={deleteFileAction}>
                        <input type="hidden" name="fileId" value={f.id} />
                        <button className="rounded-lg p-1.5 text-faint hover:bg-paper hover:text-bad" aria-label={`Delete ${f.name}`}><Trash2 className="size-4" /></button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {side !== "admin" && e.status !== "cancelled" && <FileUpload engagementId={e.id} />}
          </Card>
        </aside>
      </Section>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3 sm:px-5">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function PaymentModeNote({ mode, connected }: { mode: "stripe" | "simulated" | "off"; connected: boolean }) {
  if (mode === "stripe")
    return (
      <p className="max-w-md text-[12.5px] text-muted">
        Secure checkout by Stripe.{" "}
        {connected ? "The operator's share is transferred to their Stripe account when payment succeeds." : "Payment is collected by Operators and paid out to the operator."} Operators does not hold funds in escrow.
      </p>
    );
  if (mode === "simulated")
    return (
      <p className="flex items-start gap-1.5 text-[12.5px] text-warn">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0" /> Simulation mode: Stripe isn&rsquo;t configured, so this records a labeled test payment. No money moves.
      </p>
    );
  return <p className="text-[12.5px] text-bad">Payments aren&rsquo;t configured on this deployment. Contact support to fund this milestone.</p>;
}
