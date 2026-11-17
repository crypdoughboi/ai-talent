import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, FileSearch, Gauge, MessagesSquare, ScanSearch, ShieldCheck, Workflow } from "lucide-react";
import { ProblemComposer } from "@/components/problem-composer";
import { OperatorCard, PackageCard } from "@/components/cards";
import { Badge, ButtonLink, Section, SectionHeading } from "@/components/ui";
import { getActivePackages, getListedOperators, getPackageOfferCounts, getPublishedStories } from "@/lib/queries";
import { FUNCTIONS, TOOLS } from "@/lib/taxonomy";
import { functionName } from "@/lib/taxonomy";

export default async function HomePage() {
  const [operators, packages, offerCounts, stories] = await Promise.all([getListedOperators(), getActivePackages(), getPackageOfferCounts(), getPublishedStories()]);
  const featured = [...operators.filter((o) => o.featured), ...operators.filter((o) => !o.featured)].slice(0, 6);
  const realCount = operators.filter((o) => !o.isSample).length;
  const fnCounts = new Map<string, number>();
  for (const o of operators) for (const f of o.functions) fnCounts.set(f, (fnCounts.get(f) ?? 0) + 1);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <div className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <Section className="relative pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="animate-rise">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 py-1 pl-1 pr-3 text-[12.5px] text-ink-2 shadow-card backdrop-blur hover:border-line-strong">
              <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-paper">New</span>
              Founding operator cohort now open
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <h1 className="display mt-7 max-w-[15ch] text-[44px] sm:text-[68px] lg:text-[84px]">
              Your company&rsquo;s AI transformation starts with the right <span className="serif-accent text-signal">operator.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2 sm:text-lg">
              Hire exceptional AI-native talent to automate workflows, deploy agents, and transform your business. Scoped by outcome, vetted on evidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/match" size="lg">
                Find an AI Operator <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/apply" variant="secondary" size="lg">
                Become an Operator
              </ButtonLink>
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-[0.8fr_1.6fr] lg:gap-12">
            <div className="lg:pt-3">
              <div className="eyebrow">Try it now · no account needed</div>
              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">Describe a problem. Get an implementation brief.</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                We turn a sentence about what&rsquo;s slowing your team down into the underlying problem, proven approaches, the skills required, milestones, a labeled budget estimate, and real operators who fit.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13.5px] text-ink-2">
                {["Only the text you type is analyzed", "Matches come from reviewed, real profiles", "Estimates are labeled as estimates"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-ok" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <ProblemComposer />
          </div>
        </Section>
      </div>

      {/* ───────── Tool strip ───────── */}
      <div className="border-b border-line bg-card/50">
        <Section className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
          <span className="eyebrow shrink-0">Operators ship with</span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max gap-8 font-mono text-[13px] text-muted motion-safe:animate-[marquee_40s_linear_infinite]">
              {[...TOOLS, ...TOOLS].map((t, i) => (
                <span key={i} className="shrink-0">{t}</span>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ───────── Featured operators ───────── */}
      <Section className="pt-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Featured operators"
            title={<>Builders with <span className="serif-accent">receipts.</span></>}
            description="Profiles lead with shipped systems and measured outcomes, not job titles. Verification badges appear only after an admin reviews the evidence."
          />
          <ButtonLink href="/operators" variant="secondary" className="shrink-0">
            Browse all operators <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        {realCount === 0 && operators.length > 0 && (
          <p className="mt-6 text-[13px] text-muted">
            We&rsquo;re onboarding our founding cohort. Listings marked <span className="rounded border border-dashed border-line-strong px-1">Sample</span> are demos created by the Operators team to show how profiles work.
          </p>
        )}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((op) => (
            <OperatorCard key={op.id} op={op} />
          ))}
        </div>
      </Section>

      {/* ───────── Packages ───────── */}
      <Section className="pt-28">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Hire by outcome" title="Popular transformation projects" description="Fixed-scope packages with clear deliverables, timelines, and starting prices. Buy an outcome instead of hours." />
          <ButtonLink href="/services" variant="secondary" className="shrink-0">
            All packages <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.slice(0, 6).map((p) => (
            <PackageCard key={p.id} pkg={p} offers={offerCounts.get(p.id) ?? 0} />
          ))}
        </div>
      </Section>

      {/* ───────── Functions ───────── */}
      <Section className="pt-28">
        <SectionHeading eyebrow="Browse by function" title="Every team has hours to win back" />
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
          {FUNCTIONS.map((f) => (
            <Link key={f.slug} href={`/operators?function=${f.slug}`} className="group flex flex-col justify-between gap-6 bg-card p-5 transition-colors hover:bg-paper sm:p-6">
              <div className="flex items-start justify-between">
                <span className="text-[15px] font-semibold tracking-tight sm:text-[17px]">{f.name}</span>
                <ArrowUpRight className="size-4 text-faint transition-colors group-hover:text-signal" aria-hidden />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-[12.5px] text-muted">{f.description}</span>
                <span className="tabular shrink-0 font-mono text-[11px] text-muted">{fnCounts.get(f.slug) ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ───────── How it works ───────── */}
      <Section className="pt-28" id="how">
        <SectionHeading eyebrow="How it works" title={<>From problem to shipped system, <span className="serif-accent">measured.</span></>} />
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            { icon: MessagesSquare, t: "Describe the problem", d: "Plain English. We scope it into a brief with approaches, milestones, and a budget estimate you can edit." },
            { icon: ScanSearch, t: "Match on evidence", d: "Ranked operators with the reasons they fit, drawn only from what's on their reviewed profiles." },
            { icon: Workflow, t: "Agree scope, pay by milestone", d: "Compare proposals, accept one, and fund milestones through Stripe. No retainers, no hourly surprises." },
            { icon: Gauge, t: "Measure the outcome", d: "Track projected vs. documented impact, approve deliverables, and publish the story if you want to." },
          ].map((s, i) => (
            <div key={s.t} className="relative rounded-2xl border border-line bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-ink" aria-hidden />
                <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-[16px] font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───────── Stories ───────── */}
      {stories.length > 0 && (
        <Section className="pt-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Transformation stories" title="Before and after, in plain numbers" description="Published only with the client's approval. Illustrative examples are labeled as such." />
            <ButtonLink href="/stories" variant="secondary" className="shrink-0">
              All stories <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {stories.slice(0, 3).map(({ story }) => (
              <Link key={story.id} href={`/stories/${story.slug}`} className="group flex flex-col rounded-2xl border border-line bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center gap-2">
                  <Badge>{functionName(story.function)}</Badge>
                  {story.isSample && <Badge tone="outline" className="border-dashed">Illustrative</Badge>}
                </div>
                <h3 className="mt-5 text-[20px] font-semibold leading-snug tracking-tight">{story.title}</h3>
                <p className="mt-2 text-[13.5px] text-muted">{story.clientLabel}</p>
                {story.metrics[0] && (
                  <div className="mt-auto pt-8">
                    <div className="eyebrow">{story.metrics[0].label}</div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="tabular text-lg text-faint line-through decoration-1">{story.metrics[0].before}</span>
                      <ArrowRight className="size-4 text-signal" aria-hidden />
                      <span className="tabular text-3xl font-semibold tracking-tight">{story.metrics[0].after}</span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ───────── Vetting ───────── */}
      <Section className="pt-28" id="vetting">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-paper sm:px-12 sm:py-16">
          <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.1] invert" aria-hidden />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <div className="eyebrow !text-paper/50">Trust & vetting</div>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-tight sm:text-[40px]">
                Verified ability <span className="serif-accent text-signal">over</span> credentials.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-paper/70">
                Degrees and titles don&rsquo;t predict whether someone can ship a working agent. Evidence does. Every badge on Operators maps to something a human reviewer actually inspected.
              </p>
              <ButtonLink href="/how-it-works#vetting" variant="inverse" className="mt-8">
                Read the methodology <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-2xl bg-paper/10 sm:grid-cols-2">
              {[
                { icon: FileSearch, t: "Application review", d: "Profile, portfolio, and quantified outcomes reviewed by a person before any listing goes live." },
                { icon: BadgeCheck, t: "Evidence verification", d: "Deployments, demos, references, and skills are verified one by one. Unverified claims carry no badge." },
                { icon: ScanSearch, t: "Grounded matching", d: "Match reasons are generated only from profile fields, so no operator is ever credited with expertise they haven't listed." },
                { icon: Gauge, t: "Outcome tracking", d: "Projected vs. documented impact on every engagement, confirmed by the client before it is shown." },
              ].map((s) => (
                <li key={s.t} className="bg-ink p-6">
                  <s.icon className="size-5 text-signal" aria-hidden />
                  <h3 className="mt-5 text-[15px] font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-paper/65">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* ───────── Diagnostic + CTAs ───────── */}
      <Section className="pt-28">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-[24px] border border-line bg-signal-soft p-8 sm:p-10">
            <div className="eyebrow !text-signal-ink">Free · 3 minutes</div>
            <h3 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">Get your AI Opportunity Report</h3>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
              Answer a few questions about how your team works. Get a prioritized, shareable report of where AI can recover time, useful even if you never hire anyone.
            </p>
            <ButtonLink href="/diagnostic" className="mt-8 self-start">
              Start the diagnostic <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <div className="flex flex-col rounded-[24px] border border-line bg-card p-8 shadow-card sm:p-10">
            <div className="eyebrow">For AI talent</div>
            <h3 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">Get paid for what you can actually build</h3>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
              Self-taught power user or senior engineer, it doesn&rsquo;t matter. Show the systems you&rsquo;ve shipped, sell fixed-price outcomes, and keep 85% of every project.
            </p>
            <ButtonLink href="/apply" variant="secondary" className="mt-8 self-start">
              Apply as an operator <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
