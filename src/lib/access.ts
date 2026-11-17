import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { SessionUser } from "./auth";

/** Returns the engagement only if the user is a participant (or admin). */
export async function getEngagementForUser(user: SessionUser, engagementId: string) {
  const rows = await db
    .select({ engagement: schema.engagements, company: schema.companies, operator: schema.operators, brief: schema.briefs })
    .from(schema.engagements)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.engagements.companyId))
    .innerJoin(schema.operators, eq(schema.operators.id, schema.engagements.operatorId))
    .innerJoin(schema.briefs, eq(schema.briefs.id, schema.engagements.briefId))
    .where(eq(schema.engagements.id, engagementId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (user.role === "admin") return { ...row, side: "admin" as const };
  if (user.role === "company" && row.company.ownerId === user.id) return { ...row, side: "company" as const };
  if (user.role === "operator" && row.operator.userId === user.id) return { ...row, side: "operator" as const };
  return null;
}

/** Brief visibility: owner company, admin, invited operators, or approved operators when posted to the network. */
export async function getBriefForUser(user: SessionUser, briefId: string) {
  const rows = await db
    .select({ brief: schema.briefs, company: schema.companies })
    .from(schema.briefs)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.briefs.companyId))
    .where(eq(schema.briefs.id, briefId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (user.role === "admin") return { ...row, side: "admin" as const, operator: null, invitation: null };
  if (user.role === "company") return row.company.ownerId === user.id ? { ...row, side: "company" as const, operator: null, invitation: null } : null;
  const op = (await db.select().from(schema.operators).where(eq(schema.operators.userId, user.id)).limit(1))[0];
  if (!op) return null;
  const inv = (await db.select().from(schema.invitations).where(eq(schema.invitations.briefId, briefId))).find((i) => i.operatorId === op.id) ?? null;
  const networkVisible = row.brief.visibility === "network" && op.status === "approved" && row.brief.status === "open";
  const hasProposal = (await db.select({ id: schema.proposals.id, operatorId: schema.proposals.operatorId }).from(schema.proposals).where(eq(schema.proposals.briefId, briefId))).some((p) => p.operatorId === op.id);
  if (!inv && !networkVisible && !hasProposal) return null;
  return { ...row, side: "operator" as const, operator: op, invitation: inv };
}
