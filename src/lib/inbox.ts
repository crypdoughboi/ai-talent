import "server-only";
import { and, desc, eq, isNull, or, gt, sql, ne } from "drizzle-orm";
import { db, schema } from "./db";
import { getCompanyForUser, getOperatorForUser, type SessionUser } from "./auth";
import { newId } from "./utils";

export async function getParty(user: SessionUser) {
  if (user.role === "company") {
    const c = await getCompanyForUser(user.id);
    return c ? ({ side: "company", id: c.id } as const) : null;
  }
  if (user.role === "operator") {
    const o = await getOperatorForUser(user.id);
    return o ? ({ side: "operator", id: o.id } as const) : null;
  }
  return null;
}

export async function getUnreadCount(user: SessionUser) {
  const party = await getParty(user);
  if (!party) return 0;
  const t = schema.threads;
  const where =
    party.side === "company"
      ? and(eq(t.companyId, party.id), or(isNull(t.companyReadAt), gt(t.lastMessageAt, t.companyReadAt)))
      : and(eq(t.operatorId, party.id), or(isNull(t.operatorReadAt), gt(t.lastMessageAt, t.operatorReadAt)));
  // Only count threads that contain a message from the other party.
  const rows = await db
    .select({ n: sql<number>`count(distinct ${t.id})` })
    .from(t)
    .innerJoin(schema.messages, eq(schema.messages.threadId, t.id))
    .where(and(where, or(isNull(schema.messages.senderId), ne(schema.messages.senderId, user.id))));
  return Number(rows[0]?.n ?? 0);
}

export async function listThreads(user: SessionUser) {
  const party = await getParty(user);
  if (!party) return [];
  const t = schema.threads;
  return db
    .select({ thread: t, company: schema.companies, operator: schema.operators })
    .from(t)
    .innerJoin(schema.companies, eq(schema.companies.id, t.companyId))
    .innerJoin(schema.operators, eq(schema.operators.id, t.operatorId))
    .where(party.side === "company" ? eq(t.companyId, party.id) : eq(t.operatorId, party.id))
    .orderBy(desc(t.lastMessageAt));
}

/** Finds or creates the conversation between a company and an operator, optionally scoped to a brief. */
export async function ensureThread(companyId: string, operatorId: string, briefId: string | null, subject: string) {
  const t = schema.threads;
  const existing = await db
    .select()
    .from(t)
    .where(and(eq(t.companyId, companyId), eq(t.operatorId, operatorId), briefId ? eq(t.briefId, briefId) : isNull(t.briefId)))
    .limit(1);
  if (existing[0]) return existing[0];
  const id = newId("th");
  await db.insert(t).values({ id, companyId, operatorId, briefId, subject: subject.slice(0, 140) });
  return (await db.select().from(t).where(eq(t.id, id)).limit(1))[0]!;
}

export async function postMessage(threadId: string, senderId: string | null, body: string) {
  const now = new Date();
  await db.insert(schema.messages).values({ id: newId("msg"), threadId, senderId, body: body.slice(0, 8000), createdAt: now });
  await db.update(schema.threads).set({ lastMessageAt: now }).where(eq(schema.threads.id, threadId));
}

/** Throws unless the user is a participant (or admin). Returns the thread with both parties. */
export async function getThreadForUser(user: SessionUser, threadId: string) {
  const rows = await db
    .select({ thread: schema.threads, company: schema.companies, operator: schema.operators })
    .from(schema.threads)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.threads.companyId))
    .innerJoin(schema.operators, eq(schema.operators.id, schema.threads.operatorId))
    .where(eq(schema.threads.id, threadId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (user.role === "admin") return { ...row, side: "admin" as const };
  if (user.role === "company" && row.company.ownerId === user.id) return { ...row, side: "company" as const };
  if (user.role === "operator" && row.operator.userId === user.id) return { ...row, side: "operator" as const };
  return null;
}
