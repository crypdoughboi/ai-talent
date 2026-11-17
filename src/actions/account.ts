"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { assertUser, getCompanyForUser, getOperatorForUser, hashPassword, verifyPassword } from "@/lib/auth";
import { config } from "@/lib/config";
import { stripe } from "@/lib/payments";
import { str, type FormState } from "@/lib/forms";
import { COMPANY_SIZES, INDUSTRY_SLUGS } from "@/lib/taxonomy";

export async function updateCompanyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser(["company"]);
  const company = await getCompanyForUser(user.id);
  if (!company) return { error: "Company not found." };
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      website: z.string().trim().max(200),
      size: z.enum(COMPANY_SIZES).or(z.literal("")),
      industry: z.enum(INDUSTRY_SLUGS).or(z.literal("")),
    })
    .safeParse({ name: str(fd, "name"), website: str(fd, "website"), size: str(fd, "size"), industry: str(fd, "industry") });
  if (!parsed.success) return { error: "Please check the company details." };
  await db.update(schema.companies).set({ name: parsed.data.name, website: parsed.data.website || null, size: parsed.data.size || null, industry: parsed.data.industry || null }).where(eq(schema.companies.id, company.id));
  revalidatePath("/settings");
  return { ok: true, message: "Company updated." };
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 10) return { error: "New password must be at least 10 characters." };
  const row = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1))[0];
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { error: "Current password is incorrect." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, user.id));
  // Sign out every other session.
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  redirect("/login?next=/settings");
}

/** Starts (or resumes) Stripe Connect Express onboarding for the operator's payouts. */
export async function connectStripeAction() {
  const user = await assertUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op || !config.stripe.enabled) redirect("/settings?connect=unavailable");
  const s = stripe();
  let accountId = op.stripeAccountId;
  if (!accountId) {
    const account = await s.accounts.create({ type: "express", email: user.email, capabilities: { transfers: { requested: true } }, metadata: { operatorId: op.id } });
    accountId = account.id;
    await db.update(schema.operators).set({ stripeAccountId: accountId }).where(eq(schema.operators.id, op.id));
  }
  const link = await s.accountLinks.create({ account: accountId, type: "account_onboarding", refresh_url: `${config.appUrl}/settings?connect=retry`, return_url: `${config.appUrl}/settings?connect=done` });
  redirect(link.url);
}
