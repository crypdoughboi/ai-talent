import type { schema } from "./db";

type Op = typeof schema.operators.$inferSelect;

export const STEPS = [
  { slug: "identity", title: "Identity", blurb: "Who you are and what you do" },
  { slug: "capabilities", title: "Capabilities", blurb: "Skills, functions, tools" },
  { slug: "portfolio", title: "Proof of work", blurb: "Projects, demos, outcomes" },
  { slug: "rates", title: "Rates & availability", blurb: "How you like to work" },
  { slug: "services", title: "Fixed-price services", blurb: "Sell outcomes" },
  { slug: "verification", title: "Verification", blurb: "Evidence for review" },
  { slug: "submit", title: "Submit", blurb: "Go live" },
] as const;
export type StepSlug = (typeof STEPS)[number]["slug"];

export function stepStatus(op: Op, counts: { portfolio: number; services: number; verifications: number }) {
  const s: Record<StepSlug, boolean> = {
    identity: op.headline.length >= 10 && op.bio.length >= 80 && op.location.length > 1,
    capabilities: op.specializations.length > 0 && op.tools.length > 0 && op.functions.length > 0,
    portfolio: counts.portfolio > 0,
    rates: op.hourlyRateCents != null && op.hourlyRateCents > 0,
    services: counts.services > 0,
    verification: counts.verifications > 0,
    submit: op.status === "pending" || op.status === "approved",
  };
  const required: StepSlug[] = ["identity", "capabilities", "portfolio", "rates"];
  const missing = required.filter((k) => !s[k]);
  const pct = Math.round((Object.entries(s).filter(([k, v]) => k !== "submit" && v).length / 6) * 100);
  return { steps: s, missing, pct, canSubmit: missing.length === 0 };
}
