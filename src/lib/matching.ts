import { specName, functionName, industryName } from "./taxonomy";
import { formatMoney } from "./utils";

export type MatchableOperator = {
  id: string;
  handle: string;
  name: string;
  headline: string;
  specializations: string[];
  functions: string[];
  industries: string[];
  tools: string[];
  availability: "available" | "limited" | "booked";
  minProjectCents: number | null;
  hourlyRateCents: number | null;
  isSample: boolean;
  verifiedCount: number;
  completedCount: number;
  avgRating: number | null;
};

export type MatchInput = {
  capabilities: string[];
  functions: string[];
  industry: string | null;
  tools: string[];
  budgetMaxCents: number;
};

export type MatchResult<T extends MatchableOperator> = {
  operator: T;
  score: number;
  strength: "Strong match" | "Good match" | "Partial match";
  reasons: string[];
  gaps: string[];
};

/**
 * Transparent, deterministic ranking. Every reason shown to a company is derived from fields
 * on the operator's actual profile, so matches can never claim expertise that isn't listed.
 */
export function rankOperators<T extends MatchableOperator>(ops: T[], input: MatchInput, limit = 6): MatchResult<T>[] {
  const toolSet = new Set(input.tools.map((t) => t.toLowerCase()));
  const results = ops.map((op) => {
    const reasons: string[] = [];
    const gaps: string[] = [];
    let score = 0;

    const capHits = input.capabilities.filter((c) => op.specializations.includes(c));
    score += capHits.length * 22;
    if (capHits.length) reasons.push(`Lists ${capHits.map(specName).join(", ")}`);
    const missing = input.capabilities.filter((c) => !op.specializations.includes(c));
    if (missing.length && capHits.length) gaps.push(`No listed ${missing.map(specName).join(", ").toLowerCase()}`);

    const fnHits = input.functions.filter((f) => op.functions.includes(f));
    score += fnHits.length * 9;
    if (fnHits.length) reasons.push(`Works with ${fnHits.map(functionName).join(" & ").toLowerCase()} teams`);

    const industryHit = Boolean(input.industry && op.industries.includes(input.industry));
    if (industryHit && input.industry) {
      score += 12;
      reasons.push(`${industryName(input.industry)} experience listed`);
    }

    const toolHits = op.tools.filter((t) => toolSet.has(t.toLowerCase()));
    score += Math.min(toolHits.length, 4) * 4;
    if (toolHits.length) reasons.push(`Uses ${toolHits.slice(0, 4).join(", ")}`);

    if (op.availability === "available") score += 10;
    else if (op.availability === "limited") score += 3;
    else {
      score -= 15;
      gaps.push("Currently booked");
    }

    if (op.verifiedCount > 0) {
      score += Math.min(op.verifiedCount, 3) * 3;
      reasons.push(`${op.verifiedCount} admin-verified ${op.verifiedCount === 1 ? "credential" : "credentials"}`);
    }
    if (op.completedCount > 0) {
      score += Math.min(op.completedCount, 5) * 2;
      reasons.push(`${op.completedCount} completed ${op.completedCount === 1 ? "project" : "projects"} on Operators`);
    }
    if (op.avgRating != null) score += (op.avgRating - 3) * 3;

    if (op.minProjectCents != null) {
      if (op.minProjectCents <= input.budgetMaxCents) score += 5;
      else {
        score -= 8;
        gaps.push(`Minimum project ${formatMoney(op.minProjectCents)} is above the estimate`);
      }
    }

    const contextFit = fnHits.length > 0 || industryHit;
    const strength: MatchResult<T>["strength"] = capHits.length >= 2 && score >= 55 && contextFit ? "Strong match" : capHits.length >= 1 && score >= 30 ? "Good match" : "Partial match";
    return { operator: op, score, strength, reasons, gaps };
  });

  return results
    .filter((r) => r.reasons.length > 0 && r.score > 10)
    .sort((a, b) => b.score - a.score || Number(a.operator.isSample) - Number(b.operator.isSample))
    .slice(0, limit);
}
