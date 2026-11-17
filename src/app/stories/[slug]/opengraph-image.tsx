import { eq } from "drizzle-orm";
import { brandCard, OG_SIZE } from "@/lib/og";
import { db, schema } from "@/lib/db";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Transformation story";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const s = (await db.select().from(schema.caseStudies).where(eq(schema.caseStudies.slug, (await params).slug)).limit(1))[0];
  if (!s || s.status !== "published") return brandCard({ eyebrow: "Story", title: "Transformation story" });
  const m = s.metrics[0];
  return brandCard({ eyebrow: s.isSample ? "Illustrative example" : "Client-approved story", title: s.title, accent: s.clientLabel.slice(0, 70), stats: m ? [{ label: m.label.slice(0, 28), value: `${m.before} → ${m.after}` }] : [] });
}
