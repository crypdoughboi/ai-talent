"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assertUser, AuthError, getOperatorForUser, type SessionUser } from "@/lib/auth";
import { getBriefForUser, getEngagementForUser } from "@/lib/access";
import { ensureThread, getThreadForUser, postMessage } from "@/lib/inbox";
import { createCheckout, invoiceForMilestone, markInvoicePaid } from "@/lib/payments";
import { config } from "@/lib/config";
import { fieldErrors, str, type FormState } from "@/lib/forms";
import { formatMoney, newId, safeUrl, slugify } from "@/lib/utils";
import { track } from "@/lib/analytics";

function fail(e: unknown): FormState {
  if (e instanceof AuthError) return { error: e.message };
  if (e instanceof z.ZodError) return { fieldErrors: fieldErrors(e), error: e.issues[0]?.message ?? "Please check the form." };
  throw e;
}

async function engagementOrThrow(user: SessionUser, id: string, side?: "company" | "operator") {
  const e = await getEngagementForUser(user, id);
  if (!e) throw new AuthError("Project not found.");
  if (side && e.side !== side) throw new AuthError("You don't have permission to do that.");
  return e;
}

/* ───────────────────────────── Proposals ───────────────────────────── */

const milestoneInput = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(600), amountCents: z.number().int().min(10000, "Each milestone must be at least $100").max(50000000), days: z.number().int().min(1).max(180) });
const proposalSchema = z.object({
  coverNote: z.string().trim().min(30, "Write a short note to the client (30+ characters)").max(3000),
  approach: z.string().trim().min(30, "Describe your approach (30+ characters)").max(4000),
  milestones: z.array(milestoneInput).min(1, "Add at least one milestone").max(8),
  projectedHoursSaved: z.number().int().min(0).max(2000).nullable(),
});

export async function submitProposalAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let briefId = "";
  try {
    const user = await assertUser(["operator"]);
    briefId = str(fd, "briefId");
    const access = await getBriefForUser(user, briefId);
    if (!access || access.side !== "operator" || !access.operator) throw new AuthError("Brief not found.");
    const op = access.operator;
    if (op.status !== "approved") throw new AuthError("Your profile must be approved before you can send proposals.");
    if (access.brief.status !== "open") throw new AuthError("This brief is no longer accepting proposals.");
    const existing = await db.select().from(schema.proposals).where(and(eq(schema.proposals.briefId, briefId), eq(schema.proposals.operatorId, op.id), eq(schema.proposals.status, "submitted"))).limit(1);
    if (existing.length) throw new AuthError("You already have an active proposal on this brief. Withdraw it to send a new one.");

    const titles = fd.getAll("mTitle").map(String);
    const milestones = titles.map((t, i) => ({
      title: t.trim(),
      description: String(fd.getAll("mDesc")[i] ?? "").trim(),
      amountCents: Math.round(Number(String(fd.getAll("mAmount")[i] ?? "").replace(/[$,]/g, "")) * 100),
      days: Number(fd.getAll("mDays")[i] ?? 0),
    })).filter((m) => m.title);
    const hrs = str(fd, "projectedHoursSaved");
    const d = proposalSchema.parse({ coverNote: str(fd, "coverNote"), approach: str(fd, "approach"), milestones, projectedHoursSaved: hrs ? Number(hrs) : null });
    const total = d.milestones.reduce((s, m) => s + m.amountCents, 0);
    const days = d.milestones.reduce((s, m) => s + m.days, 0);
    await db.insert(schema.proposals).values({ id: newId("prop"), briefId, operatorId: op.id, coverNote: d.coverNote, approach: d.approach, milestones: d.milestones, totalCents: total, timelineDays: days, projectedHoursSaved: d.projectedHoursSaved });
    if (access.invitation) await db.update(schema.invitations).set({ status: "proposed" }).where(eq(schema.invitations.id, access.invitation.id));
    const thread = await ensureThread(access.company.id, op.id, briefId, access.brief.title);
    await postMessage(thread.id, null, `${op.name} sent a proposal: ${formatMoney(total)} over ${days} days.`);
    await track("proposal_submitted", { briefId, totalCents: total }, user.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/briefs/${briefId}`);
  redirect(`/briefs/${briefId}?proposed=1`);
}

export async function withdrawProposalAction(fd: FormData) {
  const user = await assertUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op) return;
  const id = str(fd, "proposalId");
  const p = (await db.select().from(schema.proposals).where(and(eq(schema.proposals.id, id), eq(schema.proposals.operatorId, op.id))).limit(1))[0];
  if (!p || p.status !== "submitted") return;
  await db.update(schema.proposals).set({ status: "withdrawn" }).where(eq(schema.proposals.id, id));
  revalidatePath(`/briefs/${p.briefId}`);
}

export async function declineInvitationAction(fd: FormData) {
  const user = await assertUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op) return;
  const inv = (await db.select().from(schema.invitations).where(and(eq(schema.invitations.id, str(fd, "invitationId")), eq(schema.invitations.operatorId, op.id))).limit(1))[0];
  if (!inv || inv.status !== "invited") return;
  await db.update(schema.invitations).set({ status: "declined" }).where(eq(schema.invitations.id, inv.id));
  const brief = (await db.select().from(schema.briefs).where(eq(schema.briefs.id, inv.briefId)).limit(1))[0];
  if (brief) {
    const thread = await ensureThread(brief.companyId, op.id, brief.id, brief.title);
    await postMessage(thread.id, null, `${op.name} declined the invitation.`);
  }
  revalidatePath("/dashboard");
}

async function createEngagement(proposal: typeof schema.proposals.$inferSelect, brief: typeof schema.briefs.$inferSelect, op: typeof schema.operators.$inferSelect) {
  const thread = await ensureThread(brief.companyId, op.id, brief.id, brief.title);
  const id = newId("eng");
  await db.insert(schema.engagements).values({
    id,
    briefId: brief.id,
    proposalId: proposal.id,
    companyId: brief.companyId,
    operatorId: op.id,
    threadId: thread.id,
    title: brief.title,
    totalCents: proposal.totalCents,
    platformFeeBps: config.platformFeeBps,
    billingModel: "fixed",
    projectedImpact: { hoursPerWeek: proposal.projectedHoursSaved ?? brief.hoursSavedHigh ?? null, note: brief.hoursSavedLow != null ? `Brief estimate: ${brief.hoursSavedLow}–${brief.hoursSavedHigh} hrs/week` : "" },
  });
  let day = 0;
  for (const [i, m] of proposal.milestones.entries()) {
    day += m.days;
    await db.insert(schema.milestones).values({ id: newId("ms"), engagementId: id, title: m.title, description: m.description, amountCents: m.amountCents, dueDays: day, sortOrder: i });
  }
  await db.update(schema.proposals).set({ status: "declined" }).where(and(eq(schema.proposals.briefId, brief.id), ne(schema.proposals.id, proposal.id), eq(schema.proposals.status, "submitted")));
  await db.update(schema.briefs).set({ status: "hired", updatedAt: new Date() }).where(eq(schema.briefs.id, brief.id));
  await db.update(schema.invitations).set({ status: "accepted" }).where(and(eq(schema.invitations.briefId, brief.id), eq(schema.invitations.operatorId, op.id)));
  await postMessage(thread.id, null, `Proposal accepted. Project created: ${formatMoney(proposal.totalCents)} across ${proposal.milestones.length} milestones. Fund the first milestone to start.`);
  await track("proposal_accepted", { totalCents: proposal.totalCents });
  return id;
}

export async function acceptProposalAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const proposalId = str(fd, "proposalId");
  const p = (await db.select().from(schema.proposals).where(eq(schema.proposals.id, proposalId)).limit(1))[0];
  if (!p) throw new AuthError("Proposal not found.");
  const access = await getBriefForUser(user, p.briefId);
  if (!access || access.side !== "company") throw new AuthError("Proposal not found.");
  if (p.status !== "submitted" || access.brief.status !== "open") throw new AuthError("This proposal can no longer be accepted.");
  const op = (await db.select().from(schema.operators).where(eq(schema.operators.id, p.operatorId)).limit(1))[0]!;
  await db.update(schema.proposals).set({ status: "accepted" }).where(eq(schema.proposals.id, p.id));
  const id = await createEngagement({ ...p, status: "accepted" }, access.brief, op);
  redirect(`/projects/${id}?accepted=1`);
}

export async function declineProposalAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const p = (await db.select().from(schema.proposals).where(eq(schema.proposals.id, str(fd, "proposalId"))).limit(1))[0];
  if (!p) return;
  const access = await getBriefForUser(user, p.briefId);
  if (!access || access.side !== "company" || p.status !== "submitted") return;
  await db.update(schema.proposals).set({ status: "declined" }).where(eq(schema.proposals.id, p.id));
  revalidatePath(`/briefs/${p.briefId}`);
}

/** Operator accepts a fixed-price package request at the listed price. */
export async function acceptServiceRequestAction(fd: FormData) {
  const user = await assertUser(["operator"]);
  const op = await getOperatorForUser(user.id);
  if (!op || op.status !== "approved") throw new AuthError("Your profile must be approved first.");
  const inv = (await db.select().from(schema.invitations).where(and(eq(schema.invitations.id, str(fd, "invitationId")), eq(schema.invitations.operatorId, op.id))).limit(1))[0];
  if (!inv || !inv.serviceId || inv.status !== "invited") throw new AuthError("Request not found.");
  const brief = (await db.select().from(schema.briefs).where(eq(schema.briefs.id, inv.briefId)).limit(1))[0];
  const service = (await db.select().from(schema.services).where(and(eq(schema.services.id, inv.serviceId), eq(schema.services.operatorId, op.id))).limit(1))[0];
  if (!brief || !service || brief.status !== "open") throw new AuthError("This request is no longer open.");
  const pkg = service.packageId ? (await db.select().from(schema.packages).where(eq(schema.packages.id, service.packageId)).limit(1))[0] : null;
  const shares = pkg?.milestones ?? [{ title: service.title, description: service.description, share: 1 }];
  let allocated = 0;
  const milestones = shares.map((m, i) => {
    const amount = i === shares.length - 1 ? service.priceCents - allocated : Math.round((service.priceCents * m.share) / 100) * 100;
    allocated += amount;
    return { title: m.title, description: m.description, amountCents: amount, days: Math.max(1, Math.round(service.timelineDays * m.share)) };
  });
  const proposalId = newId("prop");
  await db.insert(schema.proposals).values({ id: proposalId, briefId: brief.id, operatorId: op.id, coverNote: `Accepted package request at the listed price of ${formatMoney(service.priceCents)}.`, approach: service.description, milestones, totalCents: service.priceCents, timelineDays: service.timelineDays, status: "accepted" });
  const p = (await db.select().from(schema.proposals).where(eq(schema.proposals.id, proposalId)).limit(1))[0]!;
  const id = await createEngagement(p, brief, op);
  redirect(`/projects/${id}`);
}

/* ───────────────────────────── Payments ───────────────────────────── */

export async function payMilestoneAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const e = await engagementOrThrow(user, str(fd, "engagementId"), "company");
  if (e.engagement.status === "cancelled" || e.engagement.status === "completed") throw new AuthError("This project is closed.");
  const ms = await db.select().from(schema.milestones).where(eq(schema.milestones.engagementId, e.engagement.id)).orderBy(asc(schema.milestones.sortOrder));
  const target = ms.find((m) => m.id === str(fd, "milestoneId"));
  const firstUnpaid = ms.find((m) => m.status === "awaiting_payment");
  if (!target || !firstUnpaid || target.id !== firstUnpaid.id) throw new AuthError("Fund milestones in order.");
  const prev = ms[ms.indexOf(target) - 1];
  if (prev && prev.status !== "approved" && prev.status !== "submitted") throw new AuthError("Finish the current milestone before funding the next one.");
  const invoice = await invoiceForMilestone(e.engagement, target);

  if (config.stripe.enabled) {
    const session = await createCheckout(invoice, { engagementId: e.engagement.id, title: `${e.engagement.title}: ${target.title}`, customerEmail: user.email, operatorStripeAccount: e.operator.stripeAccountId });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    redirect(session.url);
  }
  if (!config.paymentsSimulation) throw new AuthError("Payments are not configured on this deployment.");
  await markInvoicePaid(invoice.id, "simulated");
  revalidatePath(`/projects/${e.engagement.id}`);
  redirect(`/projects/${e.engagement.id}?checkout=simulated`);
}

/* ───────────────────────────── Delivery ───────────────────────────── */

export async function submitDeliverableAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["operator"]);
    const e = await engagementOrThrow(user, str(fd, "engagementId"), "operator");
    const m = (await db.select().from(schema.milestones).where(and(eq(schema.milestones.id, str(fd, "milestoneId")), eq(schema.milestones.engagementId, e.engagement.id))).limit(1))[0];
    if (!m || (m.status !== "in_progress" && m.status !== "revision_requested")) throw new AuthError("This milestone isn't ready for delivery.");
    const note = str(fd, "note");
    if (note.length < 10) return { fieldErrors: { note: "Describe what you're delivering (10+ characters)" } };
    const rawUrl = str(fd, "url");
    const url = rawUrl ? safeUrl(rawUrl) : null;
    if (rawUrl && !url) return { fieldErrors: { url: "Enter a full URL starting with https://" } };
    await db.update(schema.milestones).set({ status: "submitted", deliverableNote: note.slice(0, 3000), deliverableUrl: url, submittedAt: new Date() }).where(eq(schema.milestones.id, m.id));
    await postMessage(e.engagement.threadId, null, `${e.operator.name} submitted “${m.title}” for review.`);
    revalidatePath(`/projects/${e.engagement.id}`);
    return { ok: true, message: "Submitted for client review." };
  } catch (err) {
    return fail(err);
  }
}

export async function reviewMilestoneAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const e = await engagementOrThrow(user, str(fd, "engagementId"), "company");
  const m = (await db.select().from(schema.milestones).where(and(eq(schema.milestones.id, str(fd, "milestoneId")), eq(schema.milestones.engagementId, e.engagement.id))).limit(1))[0];
  if (!m || m.status !== "submitted") throw new AuthError("Nothing to review on this milestone.");
  const decision = str(fd, "decision");
  if (decision === "approve") {
    await db.update(schema.milestones).set({ status: "approved", approvedAt: new Date(), feedback: str(fd, "feedback").slice(0, 2000) || null }).where(eq(schema.milestones.id, m.id));
    await postMessage(e.engagement.threadId, null, `“${m.title}” was approved.`);
    const remaining = await db.select({ n: sql<number>`count(*)` }).from(schema.milestones).where(and(eq(schema.milestones.engagementId, e.engagement.id), ne(schema.milestones.status, "approved")));
    if (Number(remaining[0]?.n) === 0) {
      await db.update(schema.engagements).set({ status: "completed", completedAt: new Date() }).where(eq(schema.engagements.id, e.engagement.id));
      await postMessage(e.engagement.threadId, null, `All milestones approved. Project complete.`);
      await track("engagement_completed", { totalCents: e.engagement.totalCents });
    }
  } else {
    const feedback = str(fd, "feedback");
    if (feedback.length < 5) throw new AuthError("Tell the operator what to change.");
    await db.update(schema.milestones).set({ status: "revision_requested", feedback: feedback.slice(0, 2000) }).where(eq(schema.milestones.id, m.id));
    await postMessage(e.engagement.threadId, null, `Changes requested on “${m.title}”: ${feedback.slice(0, 500)}`);
  }
  revalidatePath(`/projects/${e.engagement.id}`);
}

export async function cancelEngagementAction(fd: FormData) {
  const user = await assertUser(["company", "admin"]);
  const e = await engagementOrThrow(user, str(fd, "engagementId"));
  if (e.side === "operator") throw new AuthError("Not allowed.");
  const paid = await db.select({ n: sql<number>`count(*)` }).from(schema.invoices).where(and(eq(schema.invoices.engagementId, e.engagement.id), eq(schema.invoices.status, "paid")));
  if (Number(paid[0]?.n) > 0 && e.side !== "admin") throw new AuthError("Paid projects can only be cancelled by support.");
  await db.update(schema.engagements).set({ status: "cancelled" }).where(eq(schema.engagements.id, e.engagement.id));
  await db.update(schema.invoices).set({ status: "void" }).where(and(eq(schema.invoices.engagementId, e.engagement.id), sql`${schema.invoices.status} in ('open','processing')`));
  await db.update(schema.briefs).set({ status: "closed" }).where(eq(schema.briefs.id, e.engagement.briefId));
  await postMessage(e.engagement.threadId, null, "Project cancelled before work began.");
  revalidatePath(`/projects/${e.engagement.id}`);
}

/* ───────────────────────────── Messages & files ───────────────────────────── */

export async function sendMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["company", "operator"]);
    const t = await getThreadForUser(user, str(fd, "threadId"));
    if (!t || t.side === "admin") throw new AuthError("Conversation not found.");
    const body = str(fd, "body");
    if (!body) return { error: "Write a message first." };
    if (body.length > 8000) return { error: "Messages are limited to 8,000 characters." };
    await postMessage(t.thread.id, user.id, body);
    const now = new Date();
    await db.update(schema.threads).set(t.side === "company" ? { companyReadAt: now } : { operatorReadAt: now }).where(eq(schema.threads.id, t.thread.id));
    revalidatePath(`/messages/${t.thread.id}`);
    const eng = str(fd, "engagementId");
    if (eng) revalidatePath(`/projects/${eng}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Simple, explicit allowlist. Files are stored privately and only served to project participants. */
const FILE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv", "text/markdown", "application/json", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);

export async function uploadFileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["company", "operator"]);
    const e = await engagementOrThrow(user, str(fd, "engagementId"));
    if (e.engagement.status === "cancelled") throw new AuthError("This project is closed.");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
    if (file.size > 5 * 1024 * 1024) return { error: "Files are limited to 5 MB." };
    if (!FILE_TYPES.has(file.type)) return { error: "That file type isn't allowed. Use PDF, images, Office documents, CSV, text, JSON, or ZIP." };
    await db.insert(schema.files).values({ id: newId("file"), ownerId: user.id, engagementId: e.engagement.id, purpose: "project", name: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 140), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) });
    await postMessage(e.engagement.threadId, null, `${user.name} shared a file: ${file.name.slice(0, 140)}`);
    revalidatePath(`/projects/${e.engagement.id}`);
    return { ok: true, message: "File shared with the project." };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteFileAction(fd: FormData) {
  const user = await assertUser(["company", "operator"]);
  const f = (await db.select({ id: schema.files.id, ownerId: schema.files.ownerId, engagementId: schema.files.engagementId }).from(schema.files).where(eq(schema.files.id, str(fd, "fileId"))).limit(1))[0];
  if (!f || f.ownerId !== user.id || !f.engagementId) return;
  await db.delete(schema.files).where(eq(schema.files.id, f.id));
  revalidatePath(`/projects/${f.engagementId}`);
}

/* ───────────────────────────── Impact, reviews, stories ───────────────────────────── */

export async function documentImpactAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["operator"]);
    const e = await engagementOrThrow(user, str(fd, "engagementId"), "operator");
    const hrs = Number(str(fd, "hoursPerWeek"));
    const note = str(fd, "note");
    if (!Number.isFinite(hrs) || hrs < 0 || hrs > 2000) return { fieldErrors: { hoursPerWeek: "Enter hours per week between 0 and 2000" } };
    if (note.length < 10) return { fieldErrors: { note: "Explain how this was measured (10+ characters)" } };
    await db.update(schema.engagements).set({ documentedImpact: { hoursPerWeek: Math.round(hrs), note: note.slice(0, 1000) }, impactConfirmedAt: null }).where(eq(schema.engagements.id, e.engagement.id));
    await postMessage(e.engagement.threadId, null, `${e.operator.name} documented the measured impact: ${Math.round(hrs)} hrs/week. Awaiting client confirmation.`);
    revalidatePath(`/projects/${e.engagement.id}`);
    return { ok: true, message: "Sent to the client for confirmation." };
  } catch (err) {
    return fail(err);
  }
}

export async function confirmImpactAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const e = await engagementOrThrow(user, str(fd, "engagementId"), "company");
  if (!e.engagement.documentedImpact) return;
  await db.update(schema.engagements).set({ impactConfirmedAt: new Date() }).where(eq(schema.engagements.id, e.engagement.id));
  await postMessage(e.engagement.threadId, null, `${e.company.name} confirmed the documented impact.`);
  revalidatePath(`/projects/${e.engagement.id}`);
}

export async function leaveReviewAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["company"]);
    const e = await engagementOrThrow(user, str(fd, "engagementId"), "company");
    if (e.engagement.status !== "completed") throw new AuthError("Reviews open once the project is complete.");
    const existing = await db.select({ id: schema.reviews.id }).from(schema.reviews).where(eq(schema.reviews.engagementId, e.engagement.id)).limit(1);
    if (existing.length) throw new AuthError("You've already reviewed this project.");
    const rating = Number(str(fd, "rating"));
    const body = str(fd, "body");
    if (!(rating >= 1 && rating <= 5)) return { fieldErrors: { rating: "Choose a rating" } };
    if (body.length < 20) return { fieldErrors: { body: "Write at least a couple of sentences (20+ characters)" } };
    const label = str(fd, "showCompany") === "1" ? `${user.name}, ${e.company.name}` : `Verified client${e.company.industry ? `, ${e.company.industry}` : ""}`;
    await db.insert(schema.reviews).values({ id: newId("rev"), engagementId: e.engagement.id, operatorId: e.operator.id, authorId: user.id, authorLabel: label, rating, body: body.slice(0, 2000) });
    revalidatePath(`/projects/${e.engagement.id}`);
    revalidatePath(`/operators/${e.operator.handle}`);
    return { ok: true, message: "Thanks. Your review is on their profile." };
  } catch (err) {
    return fail(err);
  }
}

export async function draftCaseStudyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await assertUser(["operator"]);
    const e = await engagementOrThrow(user, str(fd, "engagementId"), "operator");
    if (e.engagement.status !== "completed") throw new AuthError("Case studies can be drafted after completion.");
    const lines = (k: string) => str(fd, k).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
    const title = str(fd, "title");
    const summary = str(fd, "summary");
    const clientLabel = str(fd, "clientLabel");
    if (title.length < 6 || summary.length < 20 || clientLabel.length < 3) return { error: "Add a title, a summary (20+ characters), and how the client should be described." };
    const before = lines("before");
    const after = lines("after");
    if (!before.length || !after.length) return { error: "Describe at least one 'before' and one 'after' point." };
    const metrics = str(fd, "metricLabel") ? [{ label: str(fd, "metricLabel").slice(0, 80), before: str(fd, "metricBefore").slice(0, 30), after: str(fd, "metricAfter").slice(0, 30) }] : [];
    const existing = (await db.select().from(schema.caseStudies).where(eq(schema.caseStudies.engagementId, e.engagement.id)).limit(1))[0];
    const values = { title: title.slice(0, 120), summary: summary.slice(0, 600), clientLabel: clientLabel.slice(0, 120), before, after, metrics, function: e.brief.functions[0] ?? "operations", tools: e.brief.tools.slice(0, 8), status: "pending_client" as const, clientApprovedAt: null };
    if (existing) {
      if (existing.status === "published") throw new AuthError("This story is already published.");
      await db.update(schema.caseStudies).set(values).where(eq(schema.caseStudies.id, existing.id));
    } else {
      await db.insert(schema.caseStudies).values({ id: newId("cs"), slug: `${slugify(title)}-${newId("", 4)}`, engagementId: e.engagement.id, operatorId: e.operator.id, ...values });
    }
    await postMessage(e.engagement.threadId, null, `${e.operator.name} drafted a case study and asked for your approval before publishing.`);
    revalidatePath(`/projects/${e.engagement.id}`);
    return { ok: true, message: "Sent to the client for approval. Nothing is public until they approve." };
  } catch (err) {
    return fail(err);
  }
}

export async function reviewCaseStudyAction(fd: FormData) {
  const user = await assertUser(["company"]);
  const e = await engagementOrThrow(user, str(fd, "engagementId"), "company");
  const cs = (await db.select().from(schema.caseStudies).where(eq(schema.caseStudies.engagementId, e.engagement.id)).limit(1))[0];
  if (!cs || cs.status !== "pending_client") return;
  if (str(fd, "decision") === "approve") {
    await db.update(schema.caseStudies).set({ status: "published", clientApprovedAt: new Date() }).where(eq(schema.caseStudies.id, cs.id));
    await postMessage(e.engagement.threadId, null, `${e.company.name} approved the case study. It's now public.`);
    await track("case_study_published", { slug: cs.slug });
  } else {
    await db.update(schema.caseStudies).set({ status: "draft" }).where(eq(schema.caseStudies.id, cs.id));
    await postMessage(e.engagement.threadId, null, `${e.company.name} asked for changes before the case study is published.`);
  }
  revalidatePath(`/projects/${e.engagement.id}`);
}
