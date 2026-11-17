import { eq } from "drizzle-orm";
import { brandCard, OG_SIZE } from "@/lib/og";
import { db, schema } from "@/lib/db";
import type { DiagnosticReport } from "@/lib/diagnostic";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "AI Opportunity Report";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const d = (await db.select().from(schema.diagnostics).where(eq(schema.diagnostics.id, (await params).id)).limit(1))[0];
  if (!d) return brandCard({ eyebrow: "AI Opportunity Report", title: "AI Opportunity Report" });
  const r = d.report as unknown as DiagnosticReport;
  return brandCard({
    eyebrow: "AI Opportunity Report",
    title: d.companyLabel,
    accent: r.summary.headline,
    stats: [
      { label: "Recoverable", value: `${r.summary.hoursLow}–${r.summary.hoursHigh} h/wk` },
      { label: "Opportunity", value: r.summary.level },
    ],
    footer: "Directional estimate",
  });
}
