import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getThreadForUser } from "@/lib/inbox";
import { db, schema } from "@/lib/db";
import { Avatar } from "@/components/brand";
import { Card, Section } from "@/components/ui";
import { ThreadMessages } from "@/components/thread";
import { MessageComposer } from "@/app/projects/[id]/client";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["company", "operator"]);
  const { id } = await params;
  const t = await getThreadForUser(user, id);
  if (!t || t.side === "admin") notFound();
  await db.update(schema.threads).set(t.side === "company" ? { companyReadAt: new Date() } : { operatorReadAt: new Date() }).where(eq(schema.threads.id, id));
  const owner = (await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, t.company.ownerId)).limit(1))[0];
  const names: Record<string, string> = {};
  if (owner) names[owner.id] = owner.name;
  if (t.operator.userId) names[t.operator.userId] = t.operator.name;
  const eng = (await db.select({ id: schema.engagements.id }).from(schema.engagements).where(eq(schema.engagements.threadId, id)).limit(1))[0];
  const other = t.side === "company" ? t.operator.name : t.company.name;

  return (
    <Section className="max-w-3xl py-8">
      <Link href="/messages" className="text-[13px] text-muted hover:text-ink">← All messages</Link>
      <Card className="mt-4 flex h-[calc(100dvh-12rem)] min-h-[480px] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Avatar name={other} fileId={t.side === "company" ? t.operator.avatarFileId : null} size={36} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{other}</div>
            <div className="truncate text-[12.5px] text-muted">{t.thread.subject}</div>
          </div>
          {eng ? (
            <Link href={`/projects/${eng.id}`} className="text-[13px] font-medium hover:underline">Project →</Link>
          ) : t.thread.briefId ? (
            <Link href={`/briefs/${t.thread.briefId}`} className="text-[13px] font-medium hover:underline">Brief →</Link>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col-reverse overflow-y-auto px-5 py-4">
          <ThreadMessages threadId={id} viewerId={user.id} names={names} />
        </div>
        <div className="border-t border-line p-3">
          <MessageComposer threadId={id} />
        </div>
      </Card>
    </Section>
  );
}
