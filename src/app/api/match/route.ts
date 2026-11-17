import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/auth";
import { getListedOperators } from "@/lib/queries";
import { rankOperators } from "@/lib/matching";
import { toPublicMatches } from "@/lib/public";
import { SPEC_SLUGS, FUNCTION_SLUGS, INDUSTRY_SLUGS } from "@/lib/taxonomy";

const body = z.object({
  capabilities: z.array(z.enum(SPEC_SLUGS)).max(6),
  functions: z.array(z.enum(FUNCTION_SLUGS)).max(4),
  industry: z.enum(INDUSTRY_SLUGS).nullable(),
  tools: z.array(z.string().max(40)).max(12),
  budgetMaxCents: z.number().int().min(0).max(100000000),
});

export async function POST(req: Request) {
  if (!(await rateLimit("match", 40, 60_000))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ops = await getListedOperators();
  return NextResponse.json({ matches: toPublicMatches(rankOperators(ops, parsed.data, 8)) });
}
