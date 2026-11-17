"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assertUser } from "@/lib/auth";
import { setSetting } from "@/lib/queries";
import { str } from "@/lib/forms";
import { newId, slugify } from "@/lib/utils";
import { track } from "@/lib/analytics";

async function admin() {
  return assertUser(["admin"]);
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/operators");
  revalidatePath("/");
}

export async function reviewOperatorAction(fd: FormData) {
  const user = await admin();
  const id = str(fd, "operatorId");
  const decision = str(fd, "decision");
  const note = str(fd, "note").slice(0, 1000) || null;
  const op = (await db.select().from(schema.operators).where(eq(schema.operators.id, id)).limit(1))[0];
  if (!op) return;
  const map: Record<string, Partial<typeof schema.operators.$inferInsert>> = {
    approve: { status: "approved", approvedAt: new Date(), statusNote: note },
    reject: { status: "rejected", statusNote: note ?? "Your application needs more evidence of shipped work." },
    suspend: { status: "suspended", statusNote: note },
    reinstate: { status: "approved", statusNote: null },
  };
  if (!map[decision]) return;
  await db.update(schema.operators).set(map[decision]).where(eq(schema.operators.id, id));
  await track("admin_operator_review", { operatorId: id, decision }, user.id);
  refresh();
  revalidatePath(`/operators/${op.handle}`);
}

export async function toggleFeaturedAction(fd: FormData) {
  await admin();
  const op = (await db.select().from(schema.operators).where(eq(schema.operators.id, str(fd, "operatorId"))).limit(1))[0];
  if (!op) return;
  await db.update(schema.operators).set({ featured: !op.featured }).where(eq(schema.operators.id, op.id));
  refresh();
}

export async function reviewVerificationAction(fd: FormData) {
  const user = await admin();
  const decision = str(fd, "decision");
  if (decision !== "approved" && decision !== "rejected") return;
  const v = (await db.select().from(schema.verifications).where(eq(schema.verifications.id, str(fd, "verificationId"))).limit(1))[0];
  if (!v) return;
  const op = (await db.select().from(schema.operators).where(eq(schema.operators.id, v.operatorId)).limit(1))[0];
  if (op?.isSample && decision === "approved") return; // sample listings are never verified
  await db.update(schema.verifications).set({ status: decision, reviewerId: user.id, reviewNote: str(fd, "note").slice(0, 1000) || null, reviewedAt: new Date() }).where(eq(schema.verifications.id, v.id));
  await track("admin_verification_review", { verificationId: v.id, decision }, user.id);
  refresh();
  if (op) revalidatePath(`/operators/${op.handle}`);
}

export async function toggleSamplesAction(fd: FormData) {
  await admin();
  await setSetting("show_sample_listings", str(fd, "value") === "true" ? "true" : "false");
  refresh();
  revalidatePath("/services");
  revalidatePath("/stories");
}

export async function saveCategoryAction(fd: FormData) {
  await admin();
  const id = str(fd, "id");
  const name = str(fd, "name").slice(0, 80);
  const description = str(fd, "description").slice(0, 200);
  if (id) {
    const active = str(fd, "active") === "1";
    await db.update(schema.categories).set({ name: name || undefined, description, active }).where(eq(schema.categories.id, id));
  } else {
    const kind = str(fd, "kind") === "function" ? "function" : "specialization";
    if (name.length < 2) return;
    await db.insert(schema.categories).values({ id: newId("cat"), kind, slug: slugify(name), name, description, sortOrder: 100 }).onConflictDoNothing();
  }
  revalidatePath("/admin");
}

export async function togglePackageAction(fd: FormData) {
  await admin();
  const p = (await db.select().from(schema.packages).where(eq(schema.packages.id, str(fd, "packageId"))).limit(1))[0];
  if (!p) return;
  await db.update(schema.packages).set({ active: !p.active }).where(eq(schema.packages.id, p.id));
  refresh();
  revalidatePath("/services");
}

export async function moderateStoryAction(fd: FormData) {
  await admin();
  const cs = (await db.select().from(schema.caseStudies).where(eq(schema.caseStudies.id, str(fd, "storyId"))).limit(1))[0];
  if (!cs) return;
  const next = cs.status === "hidden" ? (cs.clientApprovedAt || cs.isSample ? "published" : "draft") : "hidden";
  await db.update(schema.caseStudies).set({ status: next }).where(eq(schema.caseStudies.id, cs.id));
  revalidatePath("/admin");
  revalidatePath("/stories");
}

export async function toggleUserDisabledAction(fd: FormData) {
  const me = await admin();
  const u = (await db.select().from(schema.users).where(eq(schema.users.id, str(fd, "userId"))).limit(1))[0];
  if (!u || u.id === me.id || u.role === "admin") return;
  await db.update(schema.users).set({ disabled: !u.disabled }).where(eq(schema.users.id, u.id));
  if (!u.disabled) await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  revalidatePath("/admin");
}
