import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listThreads } from "@/lib/inbox";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { EmptyState, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser(["company", "operator"]);
  const threads = await listThreads(user);
  return (
    <Section className="max-w-3xl">
      <PageHeader eyebrow="Inbox" title="Messages" description="Conversations with companies and operators, grouped by brief." />
      {threads.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="size-5" />} title="No conversations yet" description={user.role === "company" ? "Invite an operator to a brief to start a conversation." : "Conversations start when a company invites you or you send a proposal."} />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
          {threads.map(({ thread, company, operator }) => {
            const other = user.role === "company" ? operator.name : company.name;
            const readAt = user.role === "company" ? thread.companyReadAt : thread.operatorReadAt;
            const unread = !readAt || thread.lastMessageAt > readAt;
            return (
              <li key={thread.id}>
                <Link href={`/messages/${thread.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-paper/50">
                  <Avatar name={other} fileId={user.role === "company" ? operator.avatarFileId : null} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={unread ? "font-semibold" : "font-medium text-ink-2"}>{other}</span>
                      {unread && <span className="size-2 rounded-full bg-signal" aria-label="Unread" />}
                    </div>
                    <div className="truncate text-[13px] text-muted">{thread.subject}</div>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted">{timeAgo(thread.lastMessageAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
