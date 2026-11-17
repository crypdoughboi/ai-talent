import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBrief } from "@/lib/ai";
import { rateLimit, getUser } from "@/lib/auth";
import { getListedOperators } from "@/lib/queries";
import { rankOperators } from "@/lib/matching";
import { toPublicMatches } from "@/lib/public";
import { track } from "@/lib/analytics";
import { config } from "@/lib/config";

const body = z.object({ problem: z.string().trim().min(12, "Add a little more detail so we can scope it.").max(3000) });

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  if (!(await rateLimit("brief", 12, 60_000))) {
    return NextResponse.json({ error: "You're generating briefs quickly. Give it a minute and try again." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const { brief, mode, notice } = await generateBrief(parsed.data.problem);
  const operators = await getListedOperators();
  const matches = rankOperators(operators, brief, 6);
  const user = await getUser();
  await track("brief_generated", { mode, capabilities: brief.capabilities, matches: matches.length }, user?.id);

  return NextResponse.json({
    brief,
    mode,
    notice: notice ?? null,
    aiConfigured: config.ai.enabled,
    matches: toPublicMatches(matches),
  });
}
