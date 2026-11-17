"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assertUser, AuthError, getOperatorForUser } from "@/lib/auth";
import { csv, dollarsToCents, fieldErrors, list, str, type FormState } from "@/lib/forms";
import { newId, safeUrl, slugify } from "@/lib/utils";
import { FUNCTION_SLUGS, INDUSTRY_SLUGS, SPEC_SLUGS } from "@/lib/taxonomy";
import { stepStatus } from "@/lib/onboarding";
import { track } from "@/lib/analytics";

async function requireOperator() {
  const user = await assertUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op) throw new AuthError("Operator profile not found.");
  return { user, op };
}

function fail(e: unknown): FormState {
  if (e instanceof AuthError) return { error: e.message };
  if (e instanceof z.ZodError) return { fieldErrors: fieldErrors(e), error: "Please fix the highlighted fields." };
  throw e;
}

function touch(handle?: string) {
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  if (handle) revalidatePath(`/operators/${handle}`);
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const identitySchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  handle: z.string().trim().toLowerCase().min(3, "At least 3 characters").max(40).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  headline: z.string().trim().min(10, "Write a headline of at least 10 characters").max(110),
  bio: z.string().trim().min(80, "Tell companies a bit more (80+ characters)").max(2000),
  location: z.string().trim().min(2, "Where are you based?").max(80),
  timezone: z.string().trim().max(20),
});

export async function saveIdentityAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op, user } = await requireOperator();
    const d = identitySchema.parse({ name: str(fd, "name"), handle: slugify(str(fd, "handle")), headline: str(fd, "headline"), bio: str(fd, "bio"), location: str(fd, "location"), timezone: str(fd, "timezone") });
    const clash = await db.select({ id: schema.operators.id }).from(schema.operators).where(and(eq(schema.operators.handle, d.handle), ne(schema.operators.id, op.id))).limit(1);
    if (clash.length) return { fieldErrors: { handle: "That handle is taken" } };
    const links = [
      { label: "LinkedIn", url: safeUrl(str(fd, "linkedin")) },
      { label: "GitHub", url: safeUrl(str(fd, "github")) },
      { label: "Website", url: safeUrl(str(fd, "website")) },
    ].filter((l): l is { label: string; url: string } => Boolean(l.url));

    let avatarFileId = op.avatarFileId;
    const avatar = fd.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      if (!IMAGE_TYPES.has(avatar.type)) return { fieldErrors: { avatar: "Use a PNG, JPEG, or WebP image" } };
      if (avatar.size > 1024 * 1024) return { fieldErrors: { avatar: "Keep the photo under 1 MB" } };
      avatarFileId = newId("file");
      await db.insert(schema.files).values({ id: avatarFileId, ownerId: user.id, purpose: "avatar", name: avatar.name.slice(0, 120), mimeType: avatar.type, size: avatar.size, data: Buffer.from(await avatar.arrayBuffer()) });
      if (op.avatarFileId) await db.delete(schema.files).where(eq(schema.files.id, op.avatarFileId));
    }
    await db.update(schema.operators).set({ ...d, links, avatarFileId, updatedAt: new Date() }).where(eq(schema.operators.id, op.id));
    await db.update(schema.users).set({ name: d.name }).where(eq(schema.users.id, user.id));
    touch(d.handle);
  } catch (e) {
    return fail(e);
  }
  redirect("/onboarding?step=capabilities");
}

const capSchema = z.object({
  specializations: z.array(z.enum(SPEC_SLUGS)).min(1, "Pick at least one specialization").max(5, "Pick up to 5"),
  functions: z.array(z.enum(FUNCTION_SLUGS)).min(1, "Pick at least one function").max(5),
  industries: z.array(z.enum(INDUSTRY_SLUGS)).max(6),
  tools: z.array(z.string().max(40)).min(1, "Add at least one tool").max(20),
  experienceLevel: z.enum(["emerging", "proven", "expert"]),
  yearsExperience: z.coerce.number().int().min(0).max(50),
});

export async function saveCapabilitiesAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op } = await requireOperator();
    const tools = [...new Set([...list(fd, "tools"), ...csv(fd, "otherTools")])];
    const d = capSchema.parse({ specializations: list(fd, "specializations"), functions: list(fd, "functions"), industries: list(fd, "industries"), tools, experienceLevel: str(fd, "experienceLevel"), yearsExperience: str(fd, "yearsExperience") || "0" });
    await db.update(schema.operators).set({ ...d, updatedAt: new Date() }).where(eq(schema.operators.id, op.id));
    touch(op.handle);
  } catch (e) {
    return fail(e);
  }
  redirect("/onboarding?step=portfolio");
}

const portfolioSchema = z.object({
  title: z.string().trim().min(4, "Give the project a title").max(120),
  summary: z.string().trim().max(200),
  problem: z.string().trim().min(10, "What problem did it solve?").max(1000),
  solution: z.string().trim().min(10, "What did you build?").max(1500),
  demoUrl: z.string().nullable(),
});

export async function addPortfolioAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op } = await requireOperator();
    const rawDemo = str(fd, "demoUrl");
    const demoUrl = rawDemo ? safeUrl(rawDemo) : null;
    if (rawDemo && !demoUrl) return { fieldErrors: { demoUrl: "Enter a full URL starting with https://" } };
    const d = portfolioSchema.parse({ title: str(fd, "title"), summary: str(fd, "summary"), problem: str(fd, "problem"), solution: str(fd, "solution"), demoUrl });
    const metricLabel = str(fd, "metricLabel");
    const metrics = metricLabel ? [{ label: metricLabel.slice(0, 80), before: str(fd, "metricBefore").slice(0, 30), after: str(fd, "metricAfter").slice(0, 30) }] : [];
    const count = await db.select({ n: sql<number>`count(*)` }).from(schema.portfolioItems).where(eq(schema.portfolioItems.operatorId, op.id));
    if (Number(count[0]?.n ?? 0) >= 8) return { error: "You can showcase up to 8 projects." };
    await db.insert(schema.portfolioItems).values({ id: newId("pf"), operatorId: op.id, ...d, tools: csv(fd, "tools").slice(0, 8), metrics, sortOrder: Number(count[0]?.n ?? 0) });
    touch(op.handle);
    return { ok: true, message: "Project added." };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePortfolioAction(fd: FormData) {
  const { op } = await requireOperator();
  await db.delete(schema.portfolioItems).where(and(eq(schema.portfolioItems.id, str(fd, "id")), eq(schema.portfolioItems.operatorId, op.id)));
  touch(op.handle);
}

const ratesSchema = z.object({
  hourlyRateCents: z.number().int().min(2000, "Minimum $20/hr").max(200000, "Maximum $2,000/hr"),
  minProjectCents: z.number().int().min(0).max(100000000).nullable(),
  availability: z.enum(["available", "limited", "booked"]),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
});

export async function saveRatesAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op } = await requireOperator();
    const min = str(fd, "minProject");
    const d = ratesSchema.parse({ hourlyRateCents: dollarsToCents(str(fd, "hourlyRate")), minProjectCents: min ? dollarsToCents(min) : null, availability: str(fd, "availability"), hoursPerWeek: str(fd, "hoursPerWeek") || "20" });
    await db.update(schema.operators).set({ ...d, updatedAt: new Date() }).where(eq(schema.operators.id, op.id));
    touch(op.handle);
  } catch (e) {
    return fail(e);
  }
  redirect("/onboarding?step=services");
}

const serviceSchema = z.object({
  title: z.string().trim().min(4, "Name the service").max(100),
  description: z.string().trim().min(20, "Describe the scope (20+ characters)").max(1500),
  priceCents: z.number().int().min(50000, "Minimum $500").max(50000000),
  timelineDays: z.coerce.number().int().min(3, "At least 3 days").max(180),
  deliverables: z.array(z.string().max(160)).min(1, "List at least one deliverable").max(10),
  packageId: z.string().nullable(),
});

export async function addServiceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op } = await requireOperator();
    const packageId = str(fd, "packageId") || null;
    if (packageId) {
      const p = await db.select({ id: schema.packages.id }).from(schema.packages).where(eq(schema.packages.id, packageId)).limit(1);
      if (!p.length) return { error: "Unknown package." };
    }
    const d = serviceSchema.parse({
      title: str(fd, "title"),
      description: str(fd, "description"),
      priceCents: dollarsToCents(str(fd, "price")),
      timelineDays: str(fd, "timelineDays"),
      deliverables: str(fd, "deliverables").split("\n").map((s) => s.trim()).filter(Boolean),
      packageId,
    });
    await db.insert(schema.services).values({ id: newId("svc"), operatorId: op.id, ...d });
    touch(op.handle);
    return { ok: true, message: "Service added." };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleServiceAction(fd: FormData) {
  const { op } = await requireOperator();
  const id = str(fd, "id");
  const rows = await db.select().from(schema.services).where(and(eq(schema.services.id, id), eq(schema.services.operatorId, op.id))).limit(1);
  if (!rows[0]) return;
  await db.update(schema.services).set({ active: !rows[0].active }).where(eq(schema.services.id, id));
  touch(op.handle);
}

const verificationSchema = z.object({
  kind: z.enum(["identity", "deployment", "skill", "reference"]),
  title: z.string().trim().min(4, "Describe what should be verified").max(140),
  evidenceUrl: z.string().nullable(),
  details: z.string().trim().min(20, "Add details a reviewer can check (20+ characters)").max(2000),
});

export async function addVerificationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { op } = await requireOperator();
    const raw = str(fd, "evidenceUrl");
    const evidenceUrl = raw ? safeUrl(raw) : null;
    if (raw && !evidenceUrl) return { fieldErrors: { evidenceUrl: "Enter a full URL starting with https://" } };
    const d = verificationSchema.parse({ kind: str(fd, "kind"), title: str(fd, "title"), evidenceUrl, details: str(fd, "details") });
    if (d.kind !== "reference" && !d.evidenceUrl) return { fieldErrors: { evidenceUrl: "A link to the evidence is required for this type" } };
    await db.insert(schema.verifications).values({ id: newId("ver"), operatorId: op.id, ...d });
    await track("verification_submitted", { kind: d.kind });
    touch(op.handle);
    return { ok: true, message: "Submitted for review. You'll see the result here." };
  } catch (e) {
    return fail(e);
  }
}

export async function withdrawVerificationAction(fd: FormData) {
  const { op } = await requireOperator();
  await db.delete(schema.verifications).where(and(eq(schema.verifications.id, str(fd, "id")), eq(schema.verifications.operatorId, op.id), eq(schema.verifications.status, "pending")));
  touch(op.handle);
}

export async function submitForReviewAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  try {
    const { op, user } = await requireOperator();
    const [p, s, v] = await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(schema.portfolioItems).where(eq(schema.portfolioItems.operatorId, op.id)),
      db.select({ n: sql<number>`count(*)` }).from(schema.services).where(eq(schema.services.operatorId, op.id)),
      db.select({ n: sql<number>`count(*)` }).from(schema.verifications).where(eq(schema.verifications.operatorId, op.id)),
    ]);
    const st = stepStatus(op, { portfolio: Number(p[0]?.n), services: Number(s[0]?.n), verifications: Number(v[0]?.n) });
    if (!st.canSubmit) return { error: `Complete these steps first: ${st.missing.join(", ")}.` };
    if (op.status === "approved" || op.status === "pending") return { ok: true, message: "Already submitted." };
    if (op.status === "suspended") return { error: "This profile is suspended. Contact support." };
    await db.update(schema.operators).set({ status: "pending", submittedAt: new Date(), statusNote: null }).where(eq(schema.operators.id, op.id));
    await track("operator_submitted", {}, user.id);
    touch(op.handle);
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard?submitted=1");
}

export async function setAvailabilityAction(fd: FormData) {
  const { op } = await requireOperator();
  const v = str(fd, "availability");
  if (v !== "available" && v !== "limited" && v !== "booked") return;
  await db.update(schema.operators).set({ availability: v, updatedAt: new Date() }).where(eq(schema.operators.id, op.id));
  touch(op.handle);
}
