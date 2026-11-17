import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/queries";
import { config } from "@/lib/config";
import { specName, functionName, VERIFICATION_KINDS } from "@/lib/taxonomy";
import { cn, formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { Badge, Card, EmptyState, Input, Notice, Section, Stat, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { moderateStoryAction, reviewOperatorAction, reviewVerificationAction, saveCategoryAction, toggleFeaturedAction, togglePackageAction, toggleSamplesAction, toggleUserDisabledAction } from "@/actions/admin";

export const metadata: Metadata = { title: "Admin" };

const TABS = [
  { slug: "overview", label: "Overview" },
  { slug: "applications", label: "Applications" },
  { slug: "verifications", label: "Verifications" },
  { slug: "listings", label: "Listings" },
  { slug: "catalog", label: "Categories & packages" },
  { slug: "projects", label: "Projects" },
  { slug: "users", label: "Users & waitlist" },
];

const count = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser(["admin"]);
  const { tab = "overview" } = await searchParams;
  const [pendingApps, pendingVer] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(schema.operators).where(eq(schema.operators.status, "pending")),
    db.select({ n: sql<number>`count(*)` }).from(schema.verifications).where(eq(schema.verifications.status, "pending")),
  ]);
  const badges: Record<string, number> = { applications: count(pendingApps), verifications: count(pendingVer) };

  return (
    <Section className="py-10">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow">Signed in as {user.email}</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Admin</h1>
        </div>
        <div className="flex gap-2 text-[12px]">
          <Badge tone={config.ai.enabled ? "ok" : "outline"}>AI: {config.ai.enabled ? config.ai.model : "rules engine"}</Badge>
          <Badge tone={config.stripe.enabled ? "ok" : config.paymentsSimulation ? "warn" : "bad"}>Payments: {config.stripe.enabled ? "Stripe" : config.paymentsSimulation ? "simulation" : "off"}</Badge>
        </div>
      </div>
      <nav aria-label="Admin sections" className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/admin?tab=${t.slug}`} aria-current={tab === t.slug ? "page" : undefined} className={cn("relative shrink-0 px-3 pb-3 pt-1 text-[13.5px] font-medium", tab === t.slug ? "text-ink" : "text-muted hover:text-ink")}>
            {t.label}
            {badges[t.slug] ? <span className="ml-1.5 rounded-full bg-signal px-1.5 text-[11px] text-ink">{badges[t.slug]}</span> : null}
            {tab === t.slug && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-ink" />}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <Overview />}
      {tab === "applications" && <Applications />}
      {tab === "verifications" && <Verifications />}
      {tab === "listings" && <Listings />}
      {tab === "catalog" && <Catalog />}
      {tab === "projects" && <Projects />}
      {tab === "users" && <Users meId={user.id} />}
    </Section>
  );
}

async function Overview() {
  const since = new Date(Date.now() - 7 * 864e5);
  const [roles, opStatus, briefs, proposals, engStatus, paid, diagnostics, referrals, views, topPages, briefModes, samples] = await Promise.all([
    db.select({ role: schema.users.role, n: sql<number>`count(*)` }).from(schema.users).groupBy(schema.users.role),
    db.select({ status: schema.operators.status, n: sql<number>`count(*)` }).from(schema.operators).where(eq(schema.operators.isSample, false)).groupBy(schema.operators.status),
    db.select({ n: sql<number>`count(*)` }).from(schema.briefs),
    db.select({ n: sql<number>`count(*)` }).from(schema.proposals),
    db.select({ status: schema.engagements.status, n: sql<number>`count(*)` }).from(schema.engagements).groupBy(schema.engagements.status),
    db.select({ provider: schema.invoices.provider, gmv: sql<number>`sum(${schema.invoices.amountCents})`, fee: sql<number>`sum(${schema.invoices.platformFeeCents})` }).from(schema.invoices).where(eq(schema.invoices.status, "paid")).groupBy(schema.invoices.provider),
    db.select({ n: sql<number>`count(*)` }).from(schema.diagnostics),
    db.select({ n: sql<number>`count(*)` }).from(schema.users).where(sql`${schema.users.referredById} is not null`),
    db.select({ n: sql<number>`count(*)` }).from(schema.events).where(and(eq(schema.events.name, "page_view"), gt(schema.events.createdAt, since))),
    db.select({ path: schema.events.path, n: sql<number>`count(*)` }).from(schema.events).where(and(eq(schema.events.name, "page_view"), gt(schema.events.createdAt, since))).groupBy(schema.events.path).orderBy(desc(sql`count(*)`)).limit(8),
    db.select({ mode: sql<string>`json_extract(${schema.events.props}, '$.mode')`, n: sql<number>`count(*)` }).from(schema.events).where(eq(schema.events.name, "brief_generated")).groupBy(sql`json_extract(${schema.events.props}, '$.mode')`),
    getSetting("show_sample_listings", "true"),
  ]);
  const by = <T extends { n: number }>(rows: T[], key: keyof T, v: string) => Number(rows.find((r) => r[key] === v)?.n ?? 0);
  const stripeRow = paid.find((p) => p.provider === "stripe");
  const simRow = paid.find((p) => p.provider === "simulated");
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Companies" value={by(roles, "role", "company")} />
        <Stat label="Operators (real)" value={opStatus.reduce((s, r) => s + Number(r.n), 0)} hint={`${by(opStatus, "status", "approved")} approved · ${by(opStatus, "status", "pending")} pending`} />
        <Stat label="Briefs" value={count(briefs)} hint={briefModes.map((m) => `${m.n} ${m.mode ?? "?"}`).join(" · ") + " generated"} />
        <Stat label="Proposals" value={count(proposals)} />
        <Stat label="Projects" value={engStatus.reduce((s, r) => s + Number(r.n), 0)} hint={`${by(engStatus, "status", "active")} active · ${by(engStatus, "status", "completed")} done`} />
        <Stat label="GMV (Stripe)" value={formatMoney(Number(stripeRow?.gmv ?? 0))} hint={`Fees ${formatMoney(Number(stripeRow?.fee ?? 0))}`} />
        <Stat label="Simulated volume" value={formatMoney(Number(simRow?.gmv ?? 0))} hint="Test only, not revenue" />
        <Stat label="Diagnostics" value={count(diagnostics)} hint={`${count(referrals)} referral signups`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Top pages · 7 days</h2>
            <span className="tabular text-sm text-muted">{count(views)} views</span>
          </div>
          {topPages.length === 0 ? <p className="text-sm text-muted">No traffic recorded yet.</p> : (
            <ul className="space-y-2">
              {topPages.map((p) => (
                <li key={p.path} className="flex items-center gap-3 text-[13px]">
                  <span className="w-48 truncate font-mono text-[12px]">{p.path}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2"><span className="block h-full bg-ink" style={{ width: `${(Number(p.n) / Number(topPages[0]!.n)) * 100}%` }} /></span>
                  <span className="tabular w-10 text-right text-muted">{p.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Launch controls</h2>
          <p className="mt-1 text-[13px] text-muted">Sample listings are demo profiles created by the team. They can never be hired, invited, or verified. Hide them once real operators are approved.</p>
          <form action={toggleSamplesAction} className="mt-4 flex items-center justify-between rounded-xl border border-line p-4">
            <div>
              <div className="text-[14px] font-medium">Show sample listings</div>
              <div className="text-[12.5px] text-muted">Currently {samples === "true" ? "visible" : "hidden"} across discovery, matching, packages, and stories</div>
            </div>
            <input type="hidden" name="value" value={samples === "true" ? "false" : "true"} />
            <SubmitButton size="sm" variant={samples === "true" ? "secondary" : "primary"}>{samples === "true" ? "Hide samples" : "Show samples"}</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}

async function Applications() {
  const rows = await db.select().from(schema.operators).where(eq(schema.operators.status, "pending")).orderBy(asc(schema.operators.submittedAt));
  if (!rows.length) return <EmptyState title="No applications waiting" description="New operator applications appear here when submitted." />;
  const ids = rows.map((r) => r.id);
  const [portfolio, vers] = await Promise.all([
    db.select().from(schema.portfolioItems).where(inArray(schema.portfolioItems.operatorId, ids)),
    db.select().from(schema.verifications).where(inArray(schema.verifications.operatorId, ids)),
  ]);
  return (
    <div className="space-y-4">
      {rows.map((op) => (
        <Card key={op.id} className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Avatar name={op.name} fileId={op.avatarFileId} size={44} />
                <div>
                  <Link href={`/operators/${op.handle}`} target="_blank" className="font-semibold hover:underline">{op.name} ↗</Link>
                  <div className="text-[12.5px] text-muted">{op.location} · submitted {op.submittedAt ? timeAgo(op.submittedAt) : "n/a"}</div>
                </div>
              </div>
              <p className="mt-3 font-medium">{op.headline}</p>
              <p className="mt-1 line-clamp-4 text-[13.5px] text-muted">{op.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{op.specializations.map((s) => <Badge key={s}>{specName(s)}</Badge>)}</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {portfolio.filter((p) => p.operatorId === op.id).map((p) => (
                  <div key={p.id} className="rounded-xl border border-line p-3 text-[13px]">
                    <div className="font-medium">{p.title}</div>
                    {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[12px] text-info hover:underline">{p.demoUrl}</a>}
                    {p.metrics[0] && <div className="text-[12px] text-muted">{p.metrics[0].label}: {p.metrics[0].before} → {p.metrics[0].after} (self-reported)</div>}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] text-muted">{vers.filter((v) => v.operatorId === op.id).length} verification items submitted (review them in the Verifications tab).</p>
            </div>
            <form action={reviewOperatorAction} className="w-full space-y-2 lg:w-72">
              <input type="hidden" name="operatorId" value={op.id} />
              <Textarea name="note" rows={3} placeholder="Note to the operator (shown on rejection)" aria-label="Review note" className="min-h-20" />
              <div className="flex gap-2">
                <SubmitButton name="decision" value="approve" size="sm" className="flex-1">Approve</SubmitButton>
                <SubmitButton name="decision" value="reject" size="sm" variant="danger" className="flex-1">Request changes</SubmitButton>
              </div>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}

async function Verifications() {
  const rows = await db
    .select({ v: schema.verifications, op: schema.operators })
    .from(schema.verifications)
    .innerJoin(schema.operators, eq(schema.operators.id, schema.verifications.operatorId))
    .orderBy(asc(schema.verifications.status), desc(schema.verifications.createdAt))
    .limit(100);
  if (!rows.length) return <EmptyState title="No verification evidence yet" />;
  return (
    <div className="space-y-3">
      <Notice tone="info">Approve only what you&rsquo;ve personally checked: open the evidence, contact references, and confirm identity. Approved items render as verified badges on the public profile.</Notice>
      {rows.map(({ v, op }) => (
        <Card key={v.id} className="flex flex-col gap-4 p-5 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={v.status === "approved" ? "ok" : v.status === "rejected" ? "bad" : "warn"}>{v.status}</Badge>
              <Badge tone="outline">{VERIFICATION_KINDS.find((k) => k.slug === v.kind)?.name}</Badge>
              <Link href={`/operators/${op.handle}`} className="text-[13px] font-medium hover:underline">{op.name}</Link>
              <span className="text-[12px] text-muted">{timeAgo(v.createdAt)}</span>
            </div>
            <div className="mt-2 font-semibold">{v.title}</div>
            <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{v.details}</p>
            {v.evidenceUrl && <a href={v.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-[13px] text-info hover:underline">{v.evidenceUrl} <ExternalLink className="size-3" /></a>}
            {v.reviewNote && <p className="mt-2 text-[12.5px] text-muted">Note: {v.reviewNote}</p>}
          </div>
          {v.status === "pending" && (
            <form action={reviewVerificationAction} className="w-full space-y-2 lg:w-64">
              <input type="hidden" name="verificationId" value={v.id} />
              <Input name="note" placeholder="Reviewer note" aria-label="Reviewer note" className="h-9" />
              <div className="flex gap-2">
                <SubmitButton name="decision" value="approved" size="sm" className="flex-1"><BadgeCheck className="size-4" /> Verify</SubmitButton>
                <SubmitButton name="decision" value="rejected" size="sm" variant="danger" className="flex-1">Reject</SubmitButton>
              </div>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}

async function Listings() {
  const rows = await db.select().from(schema.operators).orderBy(asc(schema.operators.isSample), desc(schema.operators.createdAt));
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead className="border-b border-line text-[12px] text-muted">
          <tr><th className="px-4 py-3 font-medium">Operator</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Created</th><th className="px-4 py-3 font-medium">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((op) => (
            <tr key={op.id}>
              <td className="px-4 py-3"><Link href={`/operators/${op.handle}`} className="font-medium hover:underline">{op.name}</Link><div className="text-[12px] text-muted">@{op.handle}</div></td>
              <td className="px-4 py-3"><Badge tone={op.status === "approved" ? "ok" : op.status === "pending" ? "warn" : op.status === "draft" ? "neutral" : "bad"}>{op.status}</Badge>{op.featured && <Badge tone="signal" className="ml-1">Featured</Badge>}</td>
              <td className="px-4 py-3">{op.isSample ? <Badge tone="outline" className="border-dashed">Sample</Badge> : "Real"}</td>
              <td className="px-4 py-3 text-muted">{formatDate(op.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <form action={toggleFeaturedAction}><input type="hidden" name="operatorId" value={op.id} /><SubmitButton size="sm" variant="ghost">{op.featured ? "Unfeature" : "Feature"}</SubmitButton></form>
                  {op.status === "approved" && <form action={reviewOperatorAction}><input type="hidden" name="operatorId" value={op.id} /><input type="hidden" name="decision" value="suspend" /><SubmitButton size="sm" variant="danger">Suspend</SubmitButton></form>}
                  {op.status === "suspended" && <form action={reviewOperatorAction}><input type="hidden" name="operatorId" value={op.id} /><input type="hidden" name="decision" value="reinstate" /><SubmitButton size="sm" variant="secondary">Reinstate</SubmitButton></form>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Catalog() {
  const [cats, pkgs, stories] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.kind), asc(schema.categories.sortOrder)),
    db.select().from(schema.packages).orderBy(asc(schema.packages.sortOrder)),
    db.select().from(schema.caseStudies).orderBy(desc(schema.caseStudies.createdAt)),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 font-semibold">Categories</h2>
        <p className="mb-3 text-[12.5px] text-muted">Rename or deactivate display categories. Matching uses the stable slugs.</p>
        <ul className="space-y-2">
          {cats.map((c) => (
            <li key={c.id}>
              <form action={saveCategoryAction} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2">
                <input type="hidden" name="id" value={c.id} />
                <Badge tone="outline" className="shrink-0">{c.kind === "function" ? "fn" : "spec"}</Badge>
                <Input name="name" defaultValue={c.name} aria-label="Category name" className="h-8 flex-1 text-[13px]" />
                <label className="flex items-center gap-1 text-[12px] text-muted"><input type="checkbox" name="active" value="1" defaultChecked={c.active} className="accent-[#131311]" /> Active</label>
                <SubmitButton size="sm" variant="ghost">Save</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveCategoryAction} className="mt-3 flex gap-2">
          <select name="kind" aria-label="Category kind" className="rounded-xl border border-line bg-card px-2 text-[13px]"><option value="specialization">Specialization</option><option value="function">Function</option></select>
          <Input name="name" placeholder="New category" aria-label="New category name" className="h-9" />
          <SubmitButton size="sm" variant="secondary">Add</SubmitButton>
        </form>
      </section>
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-semibold">Packages</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {pkgs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13.5px]">
                <span><Link href={`/services/${p.slug}`} className="font-medium hover:underline">{p.title}</Link><span className="block text-[12px] text-muted">{functionName(p.function)} · from {formatMoney(p.startingPriceCents)}</span></span>
                <form action={togglePackageAction}><input type="hidden" name="packageId" value={p.id} /><SubmitButton size="sm" variant={p.active ? "ghost" : "secondary"}>{p.active ? "Deactivate" : "Activate"}</SubmitButton></form>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Case studies</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {stories.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13.5px]">
                <span className="min-w-0"><span className="block truncate font-medium">{s.title}</span><span className="text-[12px] text-muted">{s.status}{s.isSample ? " · illustrative" : ""}</span></span>
                <form action={moderateStoryAction}><input type="hidden" name="storyId" value={s.id} /><SubmitButton size="sm" variant="ghost">{s.status === "hidden" ? "Unhide" : "Hide"}</SubmitButton></form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

async function Projects() {
  const rows = await db
    .select({ e: schema.engagements, company: schema.companies.name, operator: schema.operators.name })
    .from(schema.engagements)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.engagements.companyId))
    .innerJoin(schema.operators, eq(schema.operators.id, schema.engagements.operatorId))
    .orderBy(desc(schema.engagements.createdAt))
    .limit(100);
  if (!rows.length) return <EmptyState title="No projects yet" description="Projects appear once a company accepts a proposal." />;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
      {rows.map((r) => (
        <li key={r.e.id}>
          <Link href={`/projects/${r.e.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper/50">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.e.title}</div>
              <div className="text-[12.5px] text-muted">{r.company} ↔ {r.operator} · {formatMoney(r.e.totalCents)} · {formatDate(r.e.createdAt)}</div>
            </div>
            <Badge tone={r.e.status === "completed" ? "ok" : r.e.status === "active" ? "info" : "warn"}>{r.e.status}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Users({ meId }: { meId: string }) {
  const [users, wl] = await Promise.all([
    db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(100),
    db.select().from(schema.waitlist).orderBy(desc(schema.waitlist.createdAt)).limit(100),
  ]);
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <h2 className="mb-3 font-semibold">Users</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
              <span className="min-w-0"><span className="block truncate font-medium">{u.name}</span><span className="text-[12px] text-muted">{u.email} · {u.role} · {formatDate(u.createdAt)}</span></span>
              {u.id !== meId && u.role !== "admin" && (
                <form action={toggleUserDisabledAction}><input type="hidden" name="userId" value={u.id} /><SubmitButton size="sm" variant={u.disabled ? "secondary" : "ghost"}>{u.disabled ? "Enable" : "Disable"}</SubmitButton></form>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Waitlist</h2>
        {wl.length === 0 ? <p className="text-sm text-muted">No waitlist signups yet.</p> : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {wl.map((w) => (
              <li key={w.id} className="px-4 py-3 text-[13px]"><div className="font-medium">{w.email}</div><div className="text-[12px] text-muted">{w.kind} · {w.interest || "no note"} · {timeAgo(w.createdAt)}</div></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
