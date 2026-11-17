import { brandCard, OG_SIZE } from "@/lib/og";
import { getOperatorProfile } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Operator profile";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const p = await getOperatorProfile((await params).handle);
  if (!p || p.op.status !== "approved") return brandCard({ eyebrow: "Operator", title: "Operator profile" });
  const stats = [
    ...(p.op.hourlyRateCents ? [{ label: "Rate", value: `${formatMoney(p.op.hourlyRateCents)}/hr` }] : []),
    { label: "Verified", value: String(p.op.verifiedCount) },
    ...(p.op.completedCount ? [{ label: "Projects", value: String(p.op.completedCount) }] : []),
  ];
  return brandCard({ eyebrow: p.op.isSample ? "Sample listing" : "Operator", title: p.op.name, accent: p.op.headline.slice(0, 80), stats });
}
