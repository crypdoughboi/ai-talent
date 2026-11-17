import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getPublishedStories } from "@/lib/queries";
import { functionName } from "@/lib/taxonomy";
import { Badge, ButtonLink, EmptyState, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Transformation stories", description: "Before and after: how AI operators changed the way real teams work, published with client approval." };

export default async function StoriesPage() {
  const stories = await getPublishedStories();
  return (
    <Section>
      <PageHeader eyebrow="Transformation stories" title={<>Before and after, <span className="serif-accent text-signal">in plain numbers.</span></>} description="Real stories are published only after the client approves them. Examples created by our team to show the format are labeled Illustrative." />
      {stories.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="No stories published yet" description="Completed projects become stories once the client approves." action={<ButtonLink href="/match">Start a project</ButtonLink>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stories.map(({ story, op }) => (
            <Link key={story.id} href={`/stories/${story.slug}`} className="group flex flex-col rounded-2xl border border-line bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{functionName(story.function)}</Badge>
                {story.isSample ? <Badge tone="outline" className="border-dashed">Illustrative</Badge> : <Badge tone="ok">Client-approved</Badge>}
              </div>
              <h2 className="mt-5 text-[20px] font-semibold leading-snug tracking-tight">{story.title}</h2>
              <p className="mt-2 text-[13.5px] text-muted">{story.summary}</p>
              {story.metrics[0] && (
                <div className="mt-auto flex items-baseline gap-3 pt-8">
                  <span className="tabular text-faint line-through">{story.metrics[0].before}</span>
                  <ArrowRight className="size-4 text-signal" />
                  <span className="tabular text-2xl font-semibold">{story.metrics[0].after}</span>
                  <span className="text-[12px] text-muted">{story.metrics[0].label}</span>
                </div>
              )}
              {op && <div className="mt-4 border-t border-line pt-4 text-[12.5px] text-muted">Operator: {op.name}</div>}
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
