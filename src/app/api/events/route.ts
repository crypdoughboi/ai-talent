import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { getUser, rateLimit } from "@/lib/auth";

const ALLOWED = new Set(["page_view", "share_click", "copy_link", "cta_click"]);
const body = z.object({ name: z.string().max(40), path: z.string().max(300).optional(), props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional() });

export async function POST(req: Request) {
  if (!(await rateLimit("events", 120, 60_000))) return new NextResponse(null, { status: 204 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !ALLOWED.has(parsed.data.name)) return new NextResponse(null, { status: 204 });
  const user = await getUser();
  await track(parsed.data.name, parsed.data.props ?? {}, user?.id, parsed.data.path ?? null);
  return new NextResponse(null, { status: 204 });
}
