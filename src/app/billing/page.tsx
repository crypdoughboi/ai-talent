import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { getCompanyForUser, getOperatorForUser, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { config } from "@/lib/config";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge, EmptyState, Notice, PageHeader, Section, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser(["company", "operator"]);
  const party = user.role === "company" ? await getCompanyForUser(user.id) : await getOperatorForUser(user.id);
  const rows = party
    ? await db
        .select({ inv: schema.invoices, title: schema.engagements.title, engagementId: schema.engagements.id })
        .from(schema.invoices)
        .innerJoin(schema.engagements, eq(schema.engagements.id, schema.invoices.engagementId))
        .where(user.role === "company" ? eq(schema.engagements.companyId, party.id) : eq(schema.engagements.operatorId, party.id))
        .orderBy(desc(schema.invoices.createdAt))
    : [];
  const paid = rows.filter((r) => r.inv.status === "paid");
  const isOp = user.role === "operator";
  const total = paid.reduce((s, r) => s + (isOp ? r.inv.payoutCents : r.inv.amountCents), 0);
  const simulated = paid.filter((r) => r.inv.provider === "simulated").length;

  return (
    <Section>
      <PageHeader eyebrow="Billing" title="Transaction history" description={isOp ? "Payouts are your share of each paid milestone after the platform fee." : "Every milestone payment, with invoice numbers for your records."} />
      {!config.stripe.enabled && (
        <Notice tone="warn" title={config.paymentsSimulation ? "Payment simulation mode" : "Payments not configured"} className="mb-6">
          {config.paymentsSimulation ? "Stripe isn't configured on this deployment. Payments shown as “Simulated” moved no money." : "Stripe isn't configured on this deployment, so milestones can't be funded yet."}
        </Notice>
      )}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label={isOp ? "Total payouts" : "Total paid"} value={formatMoney(total)} hint={simulated ? `${simulated} simulated` : undefined} />
        <Stat label="Paid invoices" value={paid.length} />
        <Stat label="Open invoices" value={rows.filter((r) => r.inv.status === "open" || r.inv.status === "processing").length} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt className="size-5" />} title="No transactions yet" description="Invoices are created when a milestone is funded." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Fee ({config.platformFeeBps / 100}%)</th>
                {isOp && <th className="px-5 py-3 font-medium">Payout</th>}
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ inv, title, engagementId }) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3.5 font-mono text-[12px]">{inv.number}</td>
                  <td className="px-5 py-3.5"><Link href={`/projects/${engagementId}`} className="hover:underline">{title}</Link></td>
                  <td className="tabular px-5 py-3.5">{formatMoney(inv.amountCents)}</td>
                  <td className="tabular px-5 py-3.5 text-muted">{formatMoney(inv.platformFeeCents)}</td>
                  {isOp && <td className="tabular px-5 py-3.5 font-medium">{formatMoney(inv.payoutCents)}</td>}
                  <td className="px-5 py-3.5">
                    <Badge tone={inv.status === "paid" ? "ok" : inv.status === "void" ? "outline" : "warn"}>{inv.status}</Badge>
                    {inv.provider === "simulated" && <Badge tone="outline" className="ml-1 border-dashed">Simulated</Badge>}
                    {inv.provider === "stripe" && <Badge tone="info" className="ml-1">Stripe</Badge>}
                  </td>
                  <td className="px-5 py-3.5 text-muted">{formatDate(inv.paidAt ?? inv.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-[12.5px] text-muted">Billing model: fixed-price milestones. Hourly billing is on the roadmap; the ledger already supports it.</p>
    </Section>
  );
}
