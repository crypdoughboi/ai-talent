import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCompanyForUser, getOperatorForUser, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { Badge, Card, Notice, PageHeader, Section, Stat } from "@/components/ui";
import { ShareButtons } from "@/components/share";
import { SubmitButton } from "@/components/form";
import { connectStripeAction } from "@/actions/account";
import { CompanyForm, PasswordForm } from "./forms";

export const metadata: Metadata = { title: "Settings & referrals" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const user = await requireUser();
  const { connect } = await searchParams;
  const [clicks, referred] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(schema.events).where(and(eq(schema.events.name, "referral_click"), sql`json_extract(${schema.events.props}, '$.referrerId') = ${user.id}`)),
    db.select({ name: schema.users.name, role: schema.users.role, createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.referredById, user.id)).orderBy(desc(schema.users.createdAt)),
  ]);
  const company = user.role === "company" ? await getCompanyForUser(user.id) : null;
  const op = user.role === "operator" ? await getOperatorForUser(user.id) : null;
  const link = `${config.appUrl}/r/${user.referralCode}`;

  return (
    <Section className="max-w-4xl">
      <PageHeader eyebrow="Account" title="Settings & referrals" />
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Invite people who&rsquo;d be great here</h2>
          <p className="mt-1 text-sm text-muted">
            {user.role === "operator" ? "Know an exceptional builder, or a company that needs one? " : "Know a team that needs AI help, or an operator we should meet? "}
            Share your link. Signups within 30 days are attributed to you.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-xl border border-line bg-paper px-3.5 py-2.5 font-mono text-[13px]">{link}</code>
            <ShareButtons url={link} text="The people who make AI work. Join me on Operators." kind="referral" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Link visits" value={Number(clicks[0]?.n ?? 0)} />
            <Stat label="Signups attributed" value={referred.length} />
          </div>
          {referred.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {referred.map((r, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                  <span>{r.name.split(" ")[0]} {r.name.split(" ")[1]?.[0] ? `${r.name.split(" ")[1]![0]}.` : ""}</span>
                  <span className="flex items-center gap-2 text-muted">
                    <Badge>{r.role}</Badge> {formatDate(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {op && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-tight">Payouts</h2>
            {connect === "done" && <Notice tone="ok" className="mt-3">Stripe onboarding returned. If Stripe needs more details, it will ask next time.</Notice>}
            {connect === "unavailable" && <Notice tone="warn" className="mt-3">Stripe isn&rsquo;t configured on this deployment.</Notice>}
            <p className="mt-1 text-sm text-muted">
              Connect a Stripe Express account to receive your share of each milestone payment directly. Without one, payouts are handled manually by Operators.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {op.stripeAccountId ? <Badge tone="ok">Stripe account connected</Badge> : <Badge tone="outline">Not connected</Badge>}
              {config.stripe.enabled ? (
                <form action={connectStripeAction}>
                  <SubmitButton variant="secondary" size="sm" pendingLabel="Opening Stripe…">{op.stripeAccountId ? "Update payout details" : "Connect with Stripe"}</SubmitButton>
                </form>
              ) : (
                <span className="text-[12.5px] text-muted">Requires STRIPE_SECRET_KEY on the server.</span>
              )}
            </div>
          </Card>
        )}

        {company && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold tracking-tight">Company</h2>
            <CompanyForm company={company} />
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Password</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Signed in as {user.email}. Changing your password signs out all sessions.</p>
          <PasswordForm />
        </Card>
      </div>
    </Section>
  );
}
