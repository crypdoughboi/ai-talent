"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assertUser, AuthError, getCompanyForUser } from "@/lib/auth";
import { briefSchema, generateRulesBrief } from "@/lib/brief-engine";
import { ensureThread, postMessage } from "@/lib/inbox";
import { newId } from "@/lib/utils";
import { str, type FormState } from "@/lib/forms";
import { track } from "@/lib/analytics";

async function requireCompany() {
  const user = await assertUser(["company"]);
  const company = await getCompanyForUser(user.id);
  if (!company) throw new AuthError("Company profile not found.");
  return { user, company };
}

async function ownedBrief(companyId: string, briefId: string) {
  const rows = await db.select().from(schema.briefs).where(and(eq(schema.briefs.id, briefId), eq(schema.briefs.companyId, companyId))).limit(1);
  if (!rows[0]) throw new AuthError("Brief not found.");
  return rows[0];
}

function errorState(e: unknown): FormState {
  if (e instanceof AuthError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" };
  throw e;
}

const saveInput = briefSchema.extend({
  generatedBy: z.enum(["ai", "rules"]),
  visibility: z.enum(["invite_only", "network"]),
  inviteOperatorIds: z.array(z.string()).max(10).default([]),
  inviteMessage: z.string().max(2000).default(""),
});

/** Saves an edited brief from AI Match. Called from a client component with a JSON payload. */
export async function saveBriefAction(payload: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { company, user } = await requireCompany();
    const data = saveInput.parse(payload);
    if (data.budgetMaxCents < data.budgetMinCents) return { ok: false, error: "Maximum budget must be at least the minimum." };
    const id = newId("br");
    await db.insert(schema.briefs).values({
      id,
      companyId: company.id,
      title: data.title,
      problemStatement: data.problemStatement,
      businessProblem: data.businessProblem,
      approaches: data.approaches,
      capabilities: data.capabilities,
      functions: data.functions,
      industry: data.industry,
      tools: data.tools,
      milestones: data.milestones,
      assumptions: data.assumptions,
      budgetMinCents: data.budgetMinCents,
      budgetMaxCents: data.budgetMaxCents,
      timelineWeeks: data.timelineWeeks,
      hoursSavedLow: data.hoursSavedLow,
      hoursSavedHigh: data.hoursSavedHigh,
      generatedBy: data.generatedBy,
      visibility: data.visibility,
      status: "open",
    });
    await track("brief_saved", { generatedBy: data.generatedBy, visibility: data.visibility }, user.id);
    for (const opId of data.inviteOperatorIds) await inviteInternal(company, id, data.title, opId, data.inviteMessage, null);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: `Check the brief: ${e.issues[0]?.path.join(".")} ${e.issues[0]?.message}` };
    throw e;
  }
}

async function inviteInternal(company: typeof schema.companies.$inferSelect, briefId: string, briefTitle: string, operatorId: string, message: string, serviceId: string | null) {
  const ops = await db.select().from(schema.operators).where(eq(schema.operators.id, operatorId)).limit(1);
  const op = ops[0];
  if (!op || op.status !== "approved") throw new AuthError("That operator isn't available for invitations.");
  if (op.isSample || !op.userId) throw new AuthError(`${op.name} is a sample listing created for demonstration and can't receive invitations.`);
  const inserted = await db
    .insert(schema.invitations)
    .values({ id: newId("inv"), briefId, operatorId, message: message.slice(0, 2000), serviceId })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) return;
  const thread = await ensureThread(company.id, operatorId, briefId, briefTitle);
  await postMessage(thread.id, null, serviceId ? `${company.name} requested a package: “${briefTitle}”.` : `${company.name} invited ${op.name} to propose on “${briefTitle}”.`);
  if (message.trim()) {
    const owner = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, company.ownerId)).limit(1);
    await postMessage(thread.id, owner[0]?.id ?? null, message.trim());
  }
  await track("operator_invited", { briefId, operatorId, viaService: Boolean(serviceId) });
}

export async function inviteOperatorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { company } = await requireCompany();
    const operatorId = str(fd, "operatorId");
    let briefId = str(fd, "briefId");
    const message = str(fd, "message");
    if (briefId === "__new") {
      const description = str(fd, "description");
      if (description.length < 12) return { error: "Describe the project in a sentence or two." };
      const b = generateRulesBrief(description);
      briefId = newId("br");
      await db.insert(schema.briefs).values({
        id: briefId, companyId: company.id, title: b.title, problemStatement: b.problemStatement, businessProblem: b.businessProblem,
        approaches: b.approaches, capabilities: b.capabilities, functions: b.functions, industry: b.industry, tools: b.tools,
        milestones: b.milestones, assumptions: b.assumptions, budgetMinCents: b.budgetMinCents, budgetMaxCents: b.budgetMaxCents,
        timelineWeeks: b.timelineWeeks, hoursSavedLow: b.hoursSavedLow, hoursSavedHigh: b.hoursSavedHigh, generatedBy: "rules", status: "open",
      });
    }
    const brief = await ownedBrief(company.id, briefId);
    if (brief.status !== "open") return { error: "This brief is no longer open." };
    await inviteInternal(company, brief.id, brief.title, operatorId, message, null);
    revalidatePath(`/briefs/${brief.id}`);
    return { ok: true, message: `Invitation sent. You'll see their proposal on the brief.`, };
  } catch (e) {
    return errorState(e);
  }
}

export async function inviteFromBriefAction(briefId: string, operatorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { company } = await requireCompany();
    const brief = await ownedBrief(company.id, briefId);
    if (brief.status !== "open") return { ok: false, error: "This brief is no longer open." };
    await inviteInternal(company, brief.id, brief.title, operatorId, "", null);
    revalidatePath(`/briefs/${briefId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Buying a productized service: creates a brief from the package and sends a package request. */
export async function requestServiceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let briefId: string;
  try {
    const { company, user } = await requireCompany();
    const serviceId = str(fd, "serviceId");
    const context = str(fd, "context");
    if (context.length < 10) return { error: "Share a little context so the operator can confirm the scope." };
    const rows = await db
      .select({ service: schema.services, pkg: schema.packages, op: schema.operators })
      .from(schema.services)
      .innerJoin(schema.operators, eq(schema.operators.id, schema.services.operatorId))
      .leftJoin(schema.packages, eq(schema.packages.id, schema.services.packageId))
      .where(and(eq(schema.services.id, serviceId), eq(schema.services.active, true)))
      .limit(1);
    const row = rows[0];
    if (!row) return { error: "This service is no longer available." };
    if (row.op.isSample) return { error: `${row.op.name} is a sample listing and can't accept requests. Describe your project in AI Match to reach real operators.` };
    const pkg = row.pkg;
    const total = row.service.priceCents;
    briefId = newId("br");
    const milestones = (pkg?.milestones ?? [{ title: "Delivery", description: row.service.description, share: 1 }]).map((m) => ({
      title: m.title,
      description: m.description,
      weeks: Math.max(1, Math.round((row.service.timelineDays / 7) * m.share)),
    }));
    await db.insert(schema.briefs).values({
      id: briefId,
      companyId: company.id,
      title: row.service.title,
      problemStatement: context,
      businessProblem: pkg?.scope ?? row.service.description,
      approaches: [{ title: row.service.title, description: row.service.description, tools: [] }],
      capabilities: pkg?.specializations.length ? pkg.specializations : row.op.specializations.slice(0, 3),
      functions: pkg ? [pkg.function] : [],
      industry: null,
      tools: [],
      milestones,
      assumptions: ["Fixed price as listed by the operator.", ...(pkg?.inputs.map((i) => `Client provides: ${i}`) ?? [])],
      budgetMinCents: total,
      budgetMaxCents: total,
      timelineWeeks: Math.max(1, Math.round(row.service.timelineDays / 7)),
      generatedBy: "package",
      packageId: pkg?.id ?? null,
      status: "open",
    });
    await inviteInternal(company, briefId, row.service.title, row.op.id, context, row.service.id);
    await track("service_requested", { serviceId, packageSlug: pkg?.slug }, user.id);
  } catch (e) {
    return errorState(e);
  }
  redirect(`/briefs/${briefId}?requested=1`);
}

const editSchema = z.object({
  title: z.string().trim().min(4).max(120),
  businessProblem: z.string().trim().min(10).max(2000),
  budgetMin: z.coerce.number().min(500).max(1_000_000),
  budgetMax: z.coerce.number().min(500).max(1_000_000),
  timelineWeeks: z.coerce.number().int().min(1).max(52),
  visibility: z.enum(["invite_only", "network"]),
});

export async function updateBriefAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { company } = await requireCompany();
    const brief = await ownedBrief(company.id, str(fd, "briefId"));
    const d = editSchema.parse(Object.fromEntries(fd));
    if (d.budgetMax < d.budgetMin) return { error: "Maximum budget must be at least the minimum." };
    await db
      .update(schema.briefs)
      .set({ title: d.title, businessProblem: d.businessProblem, budgetMinCents: Math.round(d.budgetMin * 100), budgetMaxCents: Math.round(d.budgetMax * 100), timelineWeeks: d.timelineWeeks, visibility: d.visibility, updatedAt: new Date() })
      .where(eq(schema.briefs.id, brief.id));
    revalidatePath(`/briefs/${brief.id}`);
    return { ok: true, message: "Brief updated." };
  } catch (e) {
    return errorState(e);
  }
}

export async function setBriefStatusAction(fd: FormData) {
  const { company } = await requireCompany();
  const brief = await ownedBrief(company.id, str(fd, "briefId"));
  const status = str(fd, "status");
  if (status !== "open" && status !== "closed") return;
  if (brief.status === "hired") return;
  await db.update(schema.briefs).set({ status, updatedAt: new Date() }).where(eq(schema.briefs.id, brief.id));
  revalidatePath(`/briefs/${brief.id}`);
}
