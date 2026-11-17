"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getUser, rateLimit } from "@/lib/auth";
import { buildReport, diagnosticSchema } from "@/lib/diagnostic";
import { newId, slugify } from "@/lib/utils";
import { str, type FormState } from "@/lib/forms";
import { track } from "@/lib/analytics";

export async function createDiagnosticAction(payload: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(await rateLimit("diagnostic", 10, 60 * 60 * 1000))) return { ok: false, error: "You've created several reports recently. Try again later." };
  const parsed = diagnosticSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please complete the questions." };
  const answers = parsed.data;
  const report = buildReport(answers);
  const user = await getUser();
  const refCode = (await cookies()).get("op_ref")?.value;
  const referrer = refCode ? (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.referralCode, refCode)).limit(1))[0] : undefined;
  const id = `${slugify(answers.companyLabel) || "report"}-${newId("", 8)}`.slice(0, 60);
  await db.insert(schema.diagnostics).values({ id, userId: user?.id ?? null, referrerId: referrer?.id ?? null, companyLabel: answers.companyLabel || "Your company", answers, report });
  await track("diagnostic_completed", { level: report.summary.level, hoursHigh: report.summary.hoursHigh }, user?.id);
  return { ok: true, id };
}

const waitlistSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), kind: z.enum(["company", "operator"]), interest: z.string().max(200) });

export async function joinWaitlistAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("waitlist", 10, 60 * 60 * 1000))) return { error: "Too many requests. Try again later." };
  const parsed = waitlistSchema.safeParse({ email: str(fd, "email"), kind: str(fd, "kind") || "company", interest: str(fd, "interest") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await db.insert(schema.waitlist).values({ id: newId("wl"), ...parsed.data });
  await track("waitlist_joined", { kind: parsed.data.kind });
  return { ok: true, message: "You're on the list. We'll email you when we have a match." };
}
