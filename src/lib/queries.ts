import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import type { MatchableOperator } from "./matching";

export type OperatorRow = typeof schema.operators.$inferSelect;
export type OperatorListItem = OperatorRow & MatchableOperator & { fromPriceCents: number | null; reviewCount: number };

export const getSetting = cache(async (key: string, fallback: string) => {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  return rows[0]?.value ?? fallback;
});

export async function setSetting(key: string, value: string) {
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

export const showSamples = cache(async () => (await getSetting("show_sample_listings", "true")) === "true");

/** Publicly listable operators: approved real profiles, plus labeled sample listings when enabled. */
export const getListedOperators = cache(async (): Promise<OperatorListItem[]> => {
  const samples = await showSamples();
  const rows = await db
    .select()
    .from(schema.operators)
    .where(
      samples
        ? or(eq(schema.operators.status, "approved"), and(eq(schema.operators.isSample, true), eq(schema.operators.status, "approved")))
        : and(eq(schema.operators.status, "approved"), eq(schema.operators.isSample, false)),
    )
    .orderBy(desc(schema.operators.featured), asc(schema.operators.isSample), desc(schema.operators.approvedAt));
  return hydrateStats(rows);
});

export async function hydrateStats(rows: OperatorRow[]): Promise<OperatorListItem[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [verified, completed, ratings, prices] = await Promise.all([
    db
      .select({ id: schema.verifications.operatorId, n: sql<number>`count(*)` })
      .from(schema.verifications)
      .where(and(inArray(schema.verifications.operatorId, ids), eq(schema.verifications.status, "approved")))
      .groupBy(schema.verifications.operatorId),
    db
      .select({ id: schema.engagements.operatorId, n: sql<number>`count(*)` })
      .from(schema.engagements)
      .where(and(inArray(schema.engagements.operatorId, ids), eq(schema.engagements.status, "completed")))
      .groupBy(schema.engagements.operatorId),
    db
      .select({ id: schema.reviews.operatorId, avg: sql<number>`avg(${schema.reviews.rating})`, n: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(inArray(schema.reviews.operatorId, ids))
      .groupBy(schema.reviews.operatorId),
    db
      .select({ id: schema.services.operatorId, min: sql<number>`min(${schema.services.priceCents})` })
      .from(schema.services)
      .where(and(inArray(schema.services.operatorId, ids), eq(schema.services.active, true)))
      .groupBy(schema.services.operatorId),
  ]);
  const vm = new Map(verified.map((v) => [v.id, Number(v.n)]));
  const cm = new Map(completed.map((v) => [v.id, Number(v.n)]));
  const rm = new Map(ratings.map((v) => [v.id, { avg: Number(v.avg), n: Number(v.n) }]));
  const pm = new Map(prices.map((v) => [v.id, Number(v.min)]));
  return rows.map((r) => ({
    ...r,
    verifiedCount: vm.get(r.id) ?? 0,
    completedCount: cm.get(r.id) ?? 0,
    avgRating: rm.get(r.id)?.avg ?? null,
    reviewCount: rm.get(r.id)?.n ?? 0,
    fromPriceCents: pm.get(r.id) ?? null,
  }));
}

export const getOperatorProfile = cache(async (handle: string) => {
  const rows = await db.select().from(schema.operators).where(eq(schema.operators.handle, handle)).limit(1);
  const op = rows[0];
  if (!op) return null;
  const [stats] = await hydrateStats([op]);
  const [portfolio, verifications, services, reviews, stories] = await Promise.all([
    db.select().from(schema.portfolioItems).where(eq(schema.portfolioItems.operatorId, op.id)).orderBy(asc(schema.portfolioItems.sortOrder), asc(schema.portfolioItems.createdAt)),
    db.select().from(schema.verifications).where(and(eq(schema.verifications.operatorId, op.id), eq(schema.verifications.status, "approved"))),
    db
      .select({ service: schema.services, pkg: schema.packages })
      .from(schema.services)
      .leftJoin(schema.packages, eq(schema.packages.id, schema.services.packageId))
      .where(and(eq(schema.services.operatorId, op.id), eq(schema.services.active, true)))
      .orderBy(asc(schema.services.priceCents)),
    db.select().from(schema.reviews).where(eq(schema.reviews.operatorId, op.id)).orderBy(desc(schema.reviews.createdAt)),
    db.select().from(schema.caseStudies).where(and(eq(schema.caseStudies.operatorId, op.id), eq(schema.caseStudies.status, "published"))),
  ]);
  return { op: stats, portfolio, verifications, services, reviews, stories };
});

export const getActivePackages = cache(async () =>
  db.select().from(schema.packages).where(eq(schema.packages.active, true)).orderBy(asc(schema.packages.sortOrder)),
);

export async function getPackageOffers(packageId: string) {
  const samples = await showSamples();
  const rows = await db
    .select({ service: schema.services, op: schema.operators })
    .from(schema.services)
    .innerJoin(schema.operators, eq(schema.operators.id, schema.services.operatorId))
    .where(and(eq(schema.services.packageId, packageId), eq(schema.services.active, true), eq(schema.operators.status, "approved")))
    .orderBy(asc(schema.services.priceCents));
  const visible = rows.filter((r) => samples || !r.op.isSample);
  const stats = await hydrateStats(visible.map((r) => r.op));
  const byId = new Map(stats.map((s) => [s.id, s]));
  return visible.map((r) => ({ service: r.service, op: byId.get(r.op.id)! }));
}

export async function getPackageOfferCounts() {
  const samples = await showSamples();
  const rows = await db
    .select({ packageId: schema.services.packageId, isSample: schema.operators.isSample })
    .from(schema.services)
    .innerJoin(schema.operators, eq(schema.operators.id, schema.services.operatorId))
    .where(and(eq(schema.services.active, true), eq(schema.operators.status, "approved")));
  const m = new Map<string, number>();
  for (const r of rows) if (r.packageId && (samples || !r.isSample)) m.set(r.packageId, (m.get(r.packageId) ?? 0) + 1);
  return m;
}

export const getPublishedStories = cache(async () => {
  const samples = await showSamples();
  const rows = await db
    .select({ story: schema.caseStudies, op: schema.operators })
    .from(schema.caseStudies)
    .leftJoin(schema.operators, eq(schema.operators.id, schema.caseStudies.operatorId))
    .where(eq(schema.caseStudies.status, "published"))
    .orderBy(asc(schema.caseStudies.isSample), desc(schema.caseStudies.createdAt));
  return rows.filter((r) => samples || !r.story.isSample);
});
