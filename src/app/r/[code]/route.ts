import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { track } from "@/lib/analytics";
import { config } from "@/lib/config";

/** Referral links: /r/<code>?to=/some/path. Attributes signups for 30 days via a first-party cookie. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const toRaw = url.searchParams.get("to") ?? "/";
  const to = toRaw.startsWith("/") && !toRaw.startsWith("//") ? toRaw : "/";
  const res = NextResponse.redirect(new URL(to, config.appUrl));
  if (/^[a-z0-9]{6,12}$/.test(code)) {
    const owner = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.referralCode, code)).limit(1);
    if (owner[0]) {
      await track("referral_click", { referrerId: owner[0].id, to });
      res.cookies.set("op_ref", code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
    }
  }
  return res;
}
