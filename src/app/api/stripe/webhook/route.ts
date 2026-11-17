import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { config } from "@/lib/config";
import { markInvoicePaid, stripe } from "@/lib/payments";

export async function POST(req: Request) {
  if (!config.stripe.enabled || !config.stripe.webhookSecret) return NextResponse.json({ error: "Stripe webhooks are not configured" }, { status: 501 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, config.stripe.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId && session.payment_status === "paid") {
      await markInvoicePaid(invoiceId, "stripe", typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id);
    }
  }
  return NextResponse.json({ received: true });
}
