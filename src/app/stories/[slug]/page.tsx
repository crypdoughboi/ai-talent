import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowRight, Check, X } from "lucide-react";
import { db, schema } from "@/lib/db";
import { showSamples } from "@/lib/queries";
import { functionName } from "@/lib/taxonomy";
import { config } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { Badge, ButtonLink, Card, Chip, Notice, Section } from "@/components/ui";
import { ShareButtons } from "@/components/share";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const rows = await db.select({ story: schema.caseStudies, op: schema.operators }).from(schema.caseStudies).leftJoin(schema.operators, eq(schema.operators.id, schema.caseStudies.operatorId)).where(eq(schema.caseStudies.slug, slug)).limit(1);
  const row = rows[0];
  if (!row || row.story.status !== "published") return null;
  if (row.story.isSample && !(await showSamples())) return null;
  return row;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await load((await params).slug);
  return row ? { title: row.story.title, description: row.story.summary } : { title: "Story" };
}

export default async function StoryPage({ params }: Params) {
  const row = await load((await params).slug);
  if (!row) notFound();
  const { story, op } = row;
  return (
    <>
      <div className="border-b border-line">
        <Section className="max-w-4xl py-12 sm:py-16">
          <Link href="/stories" className="text-[13px] text-muted hover:text-ink">← All stories</Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge>{functionName(story.function)}</Badge>
            {story.isSample ? <Badge tone="outline" className="border-dashed">Illustrative example</Badge> : <Badge tone="ok"><Check className="size-3" /> Approved by client {story.clientApprovedAt ? formatDate(story.clientApprovedAt) : ""}</Badge>}
          </div>
          <h1 className="mt-4 text-[38px] font-semibold leading-[1.04] tracking-tight sm:text-[56px]">{story.title}</h1>
          <p className="mt-4 text-lg text-ink-2">{story.summary}</p>
          <p className="mt-2 text-sm text-muted">{story.clientLabel}</p>
          <div className="mt-6"><ShareButtons url={`${config.appUrl}/stories/${story.slug}`} text={story.title} kind="story" /></div>
        </Section>
      </div>
      <Section className="max-w-4xl space-y-10 py-12">
        {story.isSample && <Notice tone="neutral" title="Illustrative example">Created by the Operators team to show how before/after stories are presented. It does not describe a specific client engagement.</Notice>}
        {story.metrics.length > 0 && (
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {story.metrics.map((m) => (
              <div key={m.label} className="bg-card p-6">
                <div className="eyebrow">{m.label}</div>
                <div className="mt-3 flex items-baseline gap-4">
                  <span className="tabular text-xl text-faint line-through">{m.before}</span>
                  <ArrowRight className="size-5 text-signal" />
                  <span className="tabular text-[40px] font-semibold leading-none tracking-tight">{m.after}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="eyebrow mb-4">Before</div>
            <ul className="space-y-3">{story.before.map((b) => <li key={b} className="flex gap-2.5 text-[15px]"><X className="mt-1 size-4 shrink-0 text-faint" /> {b}</li>)}</ul>
          </Card>
          <Card className="border-ink p-6 ring-1 ring-ink">
            <div className="eyebrow mb-4 !text-signal-ink">After</div>
            <ul className="space-y-3">{story.after.map((b) => <li key={b} className="flex gap-2.5 text-[15px]"><Check className="mt-1 size-4 shrink-0 text-ok" /> {b}</li>)}</ul>
          </Card>
        </div>
        {story.tools.length > 0 && <div className="flex flex-wrap gap-1.5">{story.tools.map((t) => <Chip key={t}>{t}</Chip>)}</div>}
        {story.quote && <blockquote className="border-l-2 border-signal pl-5 text-xl italic leading-relaxed">“{story.quote}”</blockquote>}
        {op && (
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <Avatar name={op.name} fileId={op.avatarFileId} size={52} />
            <div className="flex-1">
              <div className="eyebrow">Built by</div>
              <div className="mt-1 font-semibold">{op.name}</div>
              <div className="text-[13.5px] text-muted">{op.headline}</div>
            </div>
            <ButtonLink href={`/operators/${op.handle}`} variant="secondary">View profile</ButtonLink>
          </Card>
        )}
        <div className="rounded-[24px] bg-ink p-8 text-paper sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Have a workflow like this?</h2>
          <p className="mt-2 max-w-lg text-paper/70">Describe it in a sentence and get a scoped brief with matched operators.</p>
          <ButtonLink href="/match" variant="signal" className="mt-6">Describe your problem <ArrowRight className="size-4" /></ButtonLink>
        </div>
      </Section>
    </>
  );
}
