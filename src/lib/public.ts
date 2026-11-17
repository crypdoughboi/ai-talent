import type { OperatorListItem } from "./queries";
import type { MatchResult } from "./matching";

/** Fields safe to send to any browser. Never include userId, Stripe ids, or status notes. */
export type PublicOperator = {
  id: string;
  handle: string;
  name: string;
  headline: string;
  location: string;
  avatarFileId: string | null;
  specializations: string[];
  availability: "available" | "limited" | "booked";
  hourlyRateCents: number | null;
  fromPriceCents: number | null;
  minProjectCents: number | null;
  isSample: boolean;
  verifiedCount: number;
  completedCount: number;
  avgRating: number | null;
  yearsExperience: number | null;
};

export function toPublicOperator(op: OperatorListItem): PublicOperator {
  return {
    id: op.id,
    handle: op.handle,
    name: op.name,
    headline: op.headline,
    location: op.location,
    avatarFileId: op.avatarFileId,
    specializations: op.specializations,
    availability: op.availability,
    hourlyRateCents: op.hourlyRateCents,
    fromPriceCents: op.fromPriceCents,
    minProjectCents: op.minProjectCents,
    isSample: op.isSample,
    verifiedCount: op.verifiedCount,
    completedCount: op.completedCount,
    avgRating: op.avgRating,
    yearsExperience: op.yearsExperience,
  };
}

export type PublicMatch = { operator: PublicOperator; strength: string; reasons: string[]; gaps: string[] };

export function toPublicMatches(results: MatchResult<OperatorListItem>[]): PublicMatch[] {
  return results.map((r) => ({ operator: toPublicOperator(r.operator), strength: r.strength, reasons: r.reasons, gaps: r.gaps }));
}
