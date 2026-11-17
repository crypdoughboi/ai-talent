import "server-only";
import Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { config } from "./config";
import { newId } from "./utils";
import { postMessage } from "./inbox";
import { track } from "./analytics";
import { formatMoney } from "./utils";

let _stripe: Stripe | null = null;
export function stripe() {
  if (!config.stripe.enabled) throw new Error("Stripe is not configured");
  if (!_stripe) _stripe = new Stripe(config.stripe.secretKey);
  return _stripe;
}

export function feeFor(amountCents: number, bps: number) {
  const fee = Math.round((amountCents * bps) / 10000);
  return { fee, payout: amountCents - fee };
}

async function nextInvoiceNumber() {
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.invoices);
  return `OPS-${String(Number(rows[0]?.n ?? 0) + 1001).padStart(5, "0")}-${newId("", 3).toUpperCase()}`;
}

/** Creates (or reuses) the open invoice for a milestone. */
export async function invoiceForMilestone(engagement: typeof schema.engagements.$inferSelect, milestone: typeof schema.milestones.$inferSelect) {
  const existing = await db
    .select()
    .from(schema.invoices)
    .where(and(eq(schema.invoices.milestoneId, milestone.id), sql`${schema.invoices.status} in ('open','processing')`))
    .limit(1);
  if (existing[0]) return existing[0];
  const { fee, payout } = feeFor(milestone.amountCents, engagement.platformFeeBps);
  const id = newId("inv");
  await db.insert(schema.invoices).values({
    id,
    number: await nextInvoiceNumber(),
    engagementId: engagement.id,
    milestoneId: milestone.id,
    kind: "milestone",
    amountCents: milestone.amountCents,
    platformFeeCents: fee,
    payoutCents: payout,
    status: "open",
  });
  return (await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1))[0]!;
}

/** Idempotently marks an invoice paid and starts the milestone. Used by webhook, return URL check, and simulation. */
export async function markInvoicePaid(invoiceId: string, provider: "stripe" | "simulated", paymentIntentId?: string | null) {
  const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).limit(1);
  const inv = rows[0];
  if (!inv || inv.status === "paid") return false;
  const now = new Date();
  const updated = await db
    .update(schema.invoices)
    .set({ status: "paid", provider, paidAt: now, stripePaymentIntentId: paymentIntentId ?? null })
    .where(and(eq(schema.invoices.id, invoiceId), sql`${schema.invoices.status} != 'paid'`))
    .returning();
  if (!updated.length) return false;
  if (inv.milestoneId) {
    await db.update(schema.milestones).set({ status: "in_progress" }).where(and(eq(schema.milestones.id, inv.milestoneId), eq(schema.milestones.status, "awaiting_payment")));
  }
  const eng = (await db.select().from(schema.engagements).where(eq(schema.engagements.id, inv.engagementId)).limit(1))[0];
  if (eng && eng.status === "awaiting_payment") {
    await db.update(schema.engagements).set({ status: "active", startedAt: now }).where(eq(schema.engagements.id, eng.id));
  }
  if (eng) {
    const ms = inv.milestoneId ? (await db.select().from(schema.milestones).where(eq(schema.milestones.id, inv.milestoneId)).limit(1))[0] : null;
    await postMessage(eng.threadId, null, `${provider === "simulated" ? "Simulated test payment" : "Payment"} of ${formatMoney(inv.amountCents)} received for “${ms?.title ?? "milestone"}” (${inv.number}). Work can begin.`);
  }
  await track("payment_succeeded", { provider, amountCents: inv.amountCents, invoice: inv.number });
  return true;
}

export async function createCheckout(invoice: typeof schema.invoices.$inferSelect, opts: { engagementId: string; title: string; customerEmail: string; operatorStripeAccount: string | null }) {
  const s = stripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: invoice.amountCents, product_data: { name: opts.title, description: `Invoice ${invoice.number}` } } }],
    payment_intent_data: opts.operatorStripeAccount
      ? { application_fee_amount: invoice.platformFeeCents, transfer_data: { destination: opts.operatorStripeAccount }, metadata: { invoiceId: invoice.id } }
      : { metadata: { invoiceId: invoice.id } },
    metadata: { invoiceId: invoice.id, engagementId: opts.engagementId },
    success_url: `${config.appUrl}/projects/${opts.engagementId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/projects/${opts.engagementId}?checkout=cancelled`,
  });
  await db.update(schema.invoices).set({ stripeSessionId: session.id, status: "processing" }).where(eq(schema.invoices.id, invoice.id));
  return session;
}

/** Called on the success redirect: confirms with Stripe directly instead of trusting the URL. */
export async function reconcileCheckoutSession(sessionId: string) {
  if (!config.stripe.enabled || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId && session.payment_status === "paid") {
      await markInvoicePaid(invoiceId, "stripe", typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id);
    }
  } catch (e) {
    console.error("[stripe] reconcile failed", e);
  }
}
