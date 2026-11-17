import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { Avatar } from "./brand";

export async function ThreadMessages({ threadId, viewerId, names, className }: { threadId: string; viewerId: string; names: Record<string, string>; className?: string }) {
  const msgs = await db.select().from(schema.messages).where(eq(schema.messages.threadId, threadId)).orderBy(asc(schema.messages.createdAt));
  if (!msgs.length) return <p className="py-8 text-center text-sm text-muted">No messages yet. Say hello.</p>;
  let lastDay = "";
  return (
    <ol className={cn("space-y-3", className)} aria-live="polite">
      {msgs.map((m) => {
        const day = formatDate(m.createdAt, { weekday: "short", month: "short", day: "numeric" });
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = m.senderId === viewerId;
        return (
          <li key={m.id}>
            {showDay && <div className="my-4 text-center font-mono text-[10.5px] uppercase tracking-wider text-faint">{day}</div>}
            {m.senderId == null ? (
              <div className="mx-auto max-w-md rounded-full bg-paper-2 px-3 py-1.5 text-center text-[12px] text-muted">{m.body}</div>
            ) : (
              <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                <Avatar name={names[m.senderId] ?? "?"} size={26} />
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed", mine ? "rounded-br-md bg-ink text-paper" : "rounded-bl-md border border-line bg-card")}>
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <div className={cn("mt-1 text-[10.5px]", mine ? "text-paper/50" : "text-faint")}>
                    {names[m.senderId]?.split(" ")[0]} · {timeAgo(m.createdAt)}
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
