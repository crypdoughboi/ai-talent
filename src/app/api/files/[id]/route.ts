import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getEngagementForUser } from "@/lib/access";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
  const file = rows[0];
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (file.purpose === "project") {
    const user = await getUser();
    if (!user || !file.engagementId || !(await getEngagementForUser(user, file.engagementId))) return new NextResponse("Not found", { status: 404 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1" || file.purpose === "project";
  const safeName = file.name.replace(/["\\\r\n]/g, "_");
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "content-type": file.purpose === "avatar" ? file.mimeType : "application/octet-stream",
      "content-length": String(file.size),
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "cache-control": file.purpose === "avatar" ? "public, max-age=86400, immutable" : "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
