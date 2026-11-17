import { brandCard, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Operators: the people who make AI work";

export default async function Image() {
  return brandCard({ eyebrow: "AI talent marketplace", title: "Your company's AI transformation starts with the right", accent: "operator." });
}
