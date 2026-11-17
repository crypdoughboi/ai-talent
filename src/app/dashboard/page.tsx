import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, Briefcase, CircleDollarSign, FileCheck2, Inbox, Package, Sparkles } from "lucide-react";
import { getCompanyForUser, getOperatorForUser, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { stepStatus } from "@/lib/onboarding";
import { config } from "@/lib/config";
import { formatDate, formatMoney, formatRange, timeAgo } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, Notice, Progress, Section, Stat, type Tone } from "@/components/ui";
import { ShareButtons } from "@/components/share";
import { setAvailabilityAction } from "@/actions/operator";
import { AVAILABILITY } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

type SP = Record<string, string | undefined>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  if (user.role === "admin") redirect("/admin");
  if (user.role === "company") return <CompanyDashboard userId={user.id} name={user.name} sp={sp} />;
  return <OperatorDashboard userId={user.id} name={user.name} referralCode={user.referralCode} sp={sp} />;
}

const ENG_TONE: Record<string, Tone> = { awaiting_payment: "warn", active: "info", completed: "ok", cancelled: "outline" };
const ENG_LABEL: Record<string, string> = { awaiting_payment: "Awaiting payment", active: "Active", completed: "Completed", cancelled: "Cancelled" };

async function engagementRows(where: ReturnType<typeof eq>) {
  const rows = await db
    .select({ e: schema.engagements, company: schema.companies.name, operator: schema.operators.name })
    .from(schema.engagements)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.engagements.companyId))
    .innerJoin(schema.operators, eq(schema.operators.id, schema.engagements.operatorId))
    .where(where)
    .orderBy(desc(schema.engagements.createdAt));
  if (!rows.length) return [];
  const ms = await db.select({ engagementId: schema.milestones.engagementId, status: schema.milestones.status }).from(schema.milestones).where(inArray(schema.milestones.engagementId, rows.map((r) => r.e.id)));
  return rows.map((r) => {
    const mine = ms.filter((m) => m.engagementId === r.e.id);
    return { ...r, total: mine.length, approved: mine.filter((m) => m.status === "approved").length, submitted: mine.filter((m) => m.status === "submitted").length, working: mine.filter((m) => m.status === "in_progress" || m.status === "revision_requested").length };
  });
}

function ProjectList({ rows, perspective }: { rows: Awaited<ReturnType<typeof engagementRows>>; perspective: "company" | "operator" }) {
  if (!rows.length) return <EmptyState icon={<Briefcase className="size-5" />} title="No projects yet" description={perspective === "company" ? "Accept a proposal to start a project workspace." : "Projects appear here when a client accepts your proposal."} />;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
      {rows.map((r) => (
        <li key={r.e.id}>
          <Link href={`/projects/${r.e.id}`} className="group flex flex-col gap-3 px-5 py-4 hover:bg-paper/50 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{r.e.title}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-faint group-hover:text-ink" />
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted">{perspective === "company" ? r.operator : r.company} · {formatMoney(r.e.totalCents)}</div>
            </div>
            <div className="flex items-center gap-4 sm:w-64">
              <Progress value={(r.approved / Math.max(1, r.total)) * 100} className="flex-1" label="Progress" />
              <Badge tone={ENG_TONE[r.e.status]}>{ENG_LABEL[r.e.status]}</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function CompanyDashboard({ userId, name, sp }: { userId: string; name: string; sp: SP }) {
  const company = await getCompanyForUser(userId);
  if (!company) return <Section className="py-16"><EmptyState title="Company profile missing" description="Contact support." /></Section>;
  const briefs = await db.select().from(schema.briefs).where(eq(schema.briefs.companyId, company.id)).orderBy(desc(schema.briefs.createdAt));
  const briefIds = briefs.map((b) => b.id);
  const proposals = briefIds.length ? await db.select({ briefId: schema.proposals.briefId, status: schema.proposals.status }).from(schema.proposals).where(inArray(schema.proposals.briefId, briefIds)) : [];
  const projects = await engagementRows(eq(schema.engagements.companyId, company.id));
  const paid = await db
    .select({ s: sql<number>`coalesce(sum(${schema.invoices.amountCents}),0)` })
    .from(schema.invoices)
    .innerJoin(schema.engagements, eq(schema.engagements.id, schema.invoices.engagementId))
    .where(and(eq(schema.engagements.companyId, company.id), eq(schema.invoices.status, "paid")));
  const pendingStories = await db.select({ id: schema.caseStudies.id, engagementId: schema.caseStudies.engagementId, title: schema.caseStudies.title }).from(schema.caseStudies).innerJoin(schema.engagements, eq(schema.engagements.id, schema.caseStudies.engagementId)).where(and(eq(schema.engagements.companyId, company.id), eq(schema.caseStudies.status, "pending_client")));

  const toReview = proposals.filter((p) => p.status === "submitted").length;
  const attention = [
    ...briefs.filter((b) => b.status === "open" && proposals.some((p) => p.briefId === b.id && p.status === "submitted")).map((b) => ({ href: `/briefs/${b.id}`, icon: Inbox, text: `New proposals on “${b.title}”` })),
    ...projects.filter((p) => p.e.status === "awaiting_payment").map((p) => ({ href: `/projects/${p.e.id}`, icon: CircleDollarSign, text: `Fund the first milestone of “${p.e.title}”` })),
    ...projects.filter((p) => p.submitted > 0).map((p) => ({ href: `/projects/${p.e.id}`, icon: FileCheck2, text: `Review a deliverable on “${p.e.title}”` })),
    ...projects.filter((p) => p.e.documentedImpact && !p.e.impactConfirmedAt).map((p) => ({ href: `/projects/${p.e.id}`, icon: Sparkles, text: `Confirm documented impact on “${p.e.title}”` })),
    ...pendingStories.map((s) => ({ href: `/projects/${s.engagementId}`, icon: Sparkles, text: `Approve the case study “${s.title}”` })),
  ];

  return (
    <Section className="py-10">
      {sp.welcome && <Notice tone="signal" title={`Welcome to Operators, ${name.split(" ")[0]}`} className="mb-6">Start by describing a problem. You&rsquo;ll get a scoped brief and matched operators in seconds.</Notice>}
      {sp.denied && <Notice tone="warn" className="mb-6">{sp.denied === "company" ? "Saving briefs requires a company account." : "That page isn't available for your account type."}</Notice>}
      <div className="flex flex-col justify-between gap-4 pb-8 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">{company.name}</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Your AI transformation</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/diagnostic" variant="secondary">Run diagnostic</ButtonLink>
          <ButtonLink href="/match">New brief <ArrowRight className="size-4" /></ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open briefs" value={briefs.filter((b) => b.status === "open").length} />
        <Stat label="Proposals to review" value={toReview} />
        <Stat label="Active projects" value={projects.filter((p) => p.e.status === "active" || p.e.status === "awaiting_payment").length} />
        <Stat label="Paid to date" value={formatMoney(Number(paid[0]?.s ?? 0))} hint={config.paymentsSimulation ? "Includes simulated test payments" : undefined} />
      </div>

      {attention.length > 0 && (
        <Card className="mt-8 p-2">
          <div className="eyebrow px-4 pb-1 pt-3">Needs your attention</div>
          <ul>
            {attention.slice(0, 6).map((a, i) => (
              <li key={i}>
                <Link href={a.href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] hover:bg-paper">
                  <a.icon className="size-4 text-signal" /> <span className="flex-1">{a.text}</span> <ArrowRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Briefs</h2>
          {briefs.length === 0 ? (
            <EmptyState icon={<Sparkles className="size-5" />} title="No briefs yet" description="Describe a problem in plain English and we'll turn it into a structured brief." action={<ButtonLink href="/match">Describe a problem</ButtonLink>} />
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
              {briefs.map((b) => {
                const n = proposals.filter((p) => p.briefId === b.id && p.status !== "withdrawn").length;
                return (
                  <li key={b.id}>
                    <Link href={`/briefs/${b.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{b.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">{b.budgetMinCents === b.budgetMaxCents ? formatMoney(b.budgetMinCents) : formatRange(b.budgetMinCents, b.budgetMaxCents)} · {formatDate(b.createdAt)}</div>
                      </div>
                      <span className="text-[12.5px] text-muted">{n} {n === 1 ? "proposal" : "proposals"}</span>
                      <Badge tone={b.status === "open" ? "ok" : b.status === "hired" ? "signal" : "outline"}>{b.status}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Projects</h2>
          <ProjectList rows={projects} perspective="company" />
        </section>
      </div>
    </Section>
  );
}

async function OperatorDashboard({ userId, name, referralCode, sp }: { userId: string; name: string; referralCode: string; sp: SP }) {
  const op = await getOperatorForUser(userId);
  if (!op) return <Section className="py-16"><EmptyState title="Operator profile missing" description="Contact support." /></Section>;
  const [invites, myProposals, projects, earned, counts] = await Promise.all([
    db
      .select({ inv: schema.invitations, brief: schema.briefs, company: schema.companies.name })
      .from(schema.invitations)
      .innerJoin(schema.briefs, eq(schema.briefs.id, schema.invitations.briefId))
      .innerJoin(schema.companies, eq(schema.companies.id, schema.briefs.companyId))
      .where(eq(schema.invitations.operatorId, op.id))
      .orderBy(desc(schema.invitations.createdAt)),
    db.select({ p: schema.proposals, title: schema.briefs.title }).from(schema.proposals).innerJoin(schema.briefs, eq(schema.briefs.id, schema.proposals.briefId)).where(eq(schema.proposals.operatorId, op.id)).orderBy(desc(schema.proposals.createdAt)),
    engagementRows(eq(schema.engagements.operatorId, op.id)),
    db
      .select({ s: sql<number>`coalesce(sum(${schema.invoices.payoutCents}),0)` })
      .from(schema.invoices)
      .innerJoin(schema.engagements, eq(schema.engagements.id, schema.invoices.engagementId))
      .where(and(eq(schema.engagements.operatorId, op.id), eq(schema.invoices.status, "paid"))),
    Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(schema.portfolioItems).where(eq(schema.portfolioItems.operatorId, op.id)),
      db.select({ n: sql<number>`count(*)` }).from(schema.services).where(eq(schema.services.operatorId, op.id)),
      db.select({ n: sql<number>`count(*)` }).from(schema.verifications).where(eq(schema.verifications.operatorId, op.id)),
    ]),
  ]);
  const st = stepStatus(op, { portfolio: Number(counts[0][0]?.n), services: Number(counts[1][0]?.n), verifications: Number(counts[2][0]?.n) });
  const openBriefs =
    op.status === "approved"
      ? (await db.select({ brief: schema.briefs, company: schema.companies.name }).from(schema.briefs).innerJoin(schema.companies, eq(schema.companies.id, schema.briefs.companyId)).where(and(eq(schema.briefs.status, "open"), eq(schema.briefs.visibility, "network"), ne(schema.briefs.generatedBy, "package"))).orderBy(desc(schema.briefs.createdAt)).limit(30))
          .filter((b) => b.brief.capabilities.some((c) => op.specializations.includes(c)))
          .filter((b) => !invites.some((i) => i.brief.id === b.brief.id) && !myProposals.some((p) => p.p.briefId === b.brief.id))
          .slice(0, 6)
      : [];
  const pendingInvites = invites.filter((i) => i.inv.status === "invited" && i.brief.status === "open");
  const shareUrl = `${config.appUrl}/r/${referralCode}?to=/operators/${op.handle}`;

  return (
    <Section className="py-10">
      {sp.submitted && <Notice tone="ok" title="Profile submitted for review" className="mb-6">A person on our team will review it, usually within 3 business days. We&rsquo;ll show the outcome here.</Notice>}
      <div className="flex flex-col justify-between gap-4 pb-8 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">Operator · @{op.handle}</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Welcome back, {name.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={setAvailabilityAction} className="flex items-center gap-1 rounded-full border border-line bg-card p-1 shadow-card">
            {AVAILABILITY.map((a) => (
              <button key={a.slug} name="availability" value={a.slug} aria-pressed={op.availability === a.slug} className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-medium", op.availability === a.slug ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper")}>
                {a.name}
              </button>
            ))}
          </form>
          <ButtonLink href="/onboarding" variant="secondary">Edit profile</ButtonLink>
        </div>
      </div>

      {op.status !== "approved" && (
        <Card className="mb-8 overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={op.status === "pending" ? "warn" : op.status === "rejected" ? "bad" : "neutral"}>{op.status === "pending" ? "In review" : op.status === "rejected" ? "Changes requested" : op.status === "suspended" ? "Suspended" : "Draft"}</Badge>
                <span className="tabular text-[13px] text-muted">{st.pct}% complete</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold">{op.status === "pending" ? "Your profile is being reviewed" : "Finish your profile to apply"}</h2>
              <p className="mt-1 text-sm text-muted">{op.status === "pending" ? "You can keep improving it while you wait. Approved profiles appear in discovery and AI matching." : op.statusNote ?? "Approved operators appear in discovery, AI matching, and package pages."}</p>
              <Progress value={st.pct} className="mt-4 max-w-md" label="Profile completeness" />
            </div>
            <ButtonLink href={op.status === "pending" ? "/onboarding?step=verification" : "/onboarding"}>{op.status === "pending" ? "Add verification evidence" : "Continue onboarding"} <ArrowRight className="size-4" /></ButtonLink>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New leads" value={pendingInvites.length} />
        <Stat label="Open proposals" value={myProposals.filter((p) => p.p.status === "submitted").length} />
        <Stat label="Active projects" value={projects.filter((p) => p.e.status === "active" || p.e.status === "awaiting_payment").length} />
        <Stat label="Earned" value={formatMoney(Number(earned[0]?.s ?? 0))} hint="After platform fee" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Leads & invitations</h2>
            {invites.length === 0 ? (
              <EmptyState icon={<Inbox className="size-5" />} title="No invitations yet" description={op.status === "approved" ? "Companies invite operators whose profiles match their briefs. Strong portfolio evidence and verified credentials rank higher." : "Invitations start once your profile is approved."} />
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
                {invites.map(({ inv, brief, company }) => (
                  <li key={inv.id}>
                    <Link href={`/briefs/${brief.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {inv.serviceId && <Package className="size-3.5 text-info" aria-label="Package request" />}
                          <span className="truncate font-semibold">{brief.title}</span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-muted">{company} · {brief.budgetMinCents === brief.budgetMaxCents ? formatMoney(brief.budgetMinCents) : formatRange(brief.budgetMinCents, brief.budgetMaxCents)} · {timeAgo(inv.createdAt)}</div>
                      </div>
                      <Badge tone={inv.status === "invited" ? "signal" : inv.status === "declined" ? "outline" : "ok"}>{inv.status === "invited" ? (inv.serviceId ? "Package request" : "Respond") : inv.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {openBriefs.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold tracking-tight">Open briefs for your skills</h2>
              <p className="mb-4 text-sm text-muted">Posted to the approved network and matching your specializations.</p>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
                {openBriefs.map(({ brief, company }) => (
                  <li key={brief.id}>
                    <Link href={`/briefs/${brief.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{brief.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">{company} · {formatRange(brief.budgetMinCents, brief.budgetMaxCents)} · {brief.timelineWeeks} wk</div>
                      </div>
                      <ArrowRight className="size-4 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Projects</h2>
            <ProjectList rows={projects} perspective="operator" />
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="eyebrow">Your public profile</div>
            <p className="mt-2 text-[13.5px] text-muted">Share it on LinkedIn, X, or your site. Signups through your link are attributed to you.</p>
            <div className="mt-4"><ShareButtons url={shareUrl} text={`I'm on Operators: ${op.headline}`} kind="profile" /></div>
            <Link href={`/operators/${op.handle}`} className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium hover:underline">View profile <ArrowUpRight className="size-3.5" /></Link>
          </Card>
          <Card className="p-5">
            <div className="eyebrow mb-3">Proposals</div>
            {myProposals.length === 0 ? (
              <p className="text-[13px] text-muted">No proposals yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {myProposals.slice(0, 6).map(({ p, title }) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <Link href={`/briefs/${p.briefId}`} className="truncate hover:underline">{title}</Link>
                    <Badge tone={p.status === "accepted" ? "ok" : p.status === "submitted" ? "warn" : "outline"}>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </Section>
  );
}
