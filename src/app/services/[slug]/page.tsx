import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Check, Clock, FileInput, Package } from "lucide-react";
import { db, schema } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getListedOperators, getPackageOffers } from "@/lib/queries";
import { rankOperators } from "@/lib/matching";
import { functionName, specName } from "@/lib/taxonomy";
import { formatMoney } from "@/lib/utils";
import { Avatar } from "@/components/brand";
import { AvailabilityDot, OperatorCard, SampleBadge } from "@/components/cards";
import { Badge, ButtonLink, Card, Section } from "@/components/ui";
import { ServiceRequestForm } from "@/components/hire-forms";

type Params = { params: Promise<{ slug: string }> };

async function getPkg(slug: string) {
  const rows = await db.select().from(schema.packages).where(and(eq(schema.packages.slug, slug), eq(schema.packages.active, true))).limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const pkg = await getPkg((await params).slug);
  return pkg ? { title: pkg.title, description: pkg.tagline } : { title: "Package" };
}

export default async function PackagePage({ params }: Params) {
  const pkg = await getPkg((await params).slug);
  if (!pkg) notFound();
  const [offers, user, listed] = await Promise.all([getPackageOffers(pkg.id), getUser(), getListedOperators()]);
  const offerIds = new Set(offers.map((o) => o.op.id));
  const alsoQualified = rankOperators(
    listed.filter((o) => !offerIds.has(o.id)),
    { capabilities: pkg.specializations, functions: [pkg.function], industry: null, tools: [], budgetMaxCents: pkg.startingPriceCents * 3 },
    3,
  ).filter((m) => m.strength !== "Partial match");

  return (
    <>
      <div className="border-b border-line">
        <Section className="py-12 sm:py-16">
          <Link href="/services" className="text-[13px] text-muted hover:text-ink">← All packages</Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <Badge>{functionName(pkg.function)}</Badge>
              <h1 className="mt-4 text-[36px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">{pkg.title}</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">{pkg.tagline}</p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              <Fact label="Starting at" value={formatMoney(pkg.startingPriceCents)} />
              <Fact label="Timeline" value={`${pkg.timelineMinWeeks}–${pkg.timelineMaxWeeks} wk`} />
              <Fact label="Offering" value={String(offers.length)} />
            </div>
          </div>
        </Section>
      </div>

      <Section className="grid gap-10 py-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-12">
          <Block icon={<Package className="size-4" />} title="Scope">
            <p className="text-[15.5px] leading-relaxed text-ink-2">{pkg.scope}</p>
            <p className="mt-4 rounded-xl bg-paper-2 px-4 py-3 text-[14px] text-ink-2">
              <span className="font-semibold">Outcome: </span>
              {pkg.outcome}
            </p>
          </Block>
          <Block icon={<Check className="size-4" />} title="Deliverables">
            <ul className="grid gap-2 sm:grid-cols-2">
              {pkg.deliverables.map((d) => (
                <li key={d} className="flex gap-2.5 rounded-xl border border-line bg-card p-3.5 text-[14px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </Block>
          <Block icon={<Clock className="size-4" />} title="How it runs">
            <ol className="space-y-3">
              {pkg.milestones.map((m, i) => (
                <li key={m.title} className="flex gap-4 rounded-xl border border-line bg-card p-4">
                  <span className="font-mono text-[12px] text-signal-ink">0{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{m.title}</span>
                      <span className="tabular text-[12px] text-muted">{Math.round(m.share * 100)}% of fee</span>
                    </div>
                    <p className="mt-1 text-[13.5px] text-muted">{m.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12.5px] text-muted">Each milestone is paid when it starts and approved by you when delivered.</p>
          </Block>
          <Block icon={<FileInput className="size-4" />} title="What you'll need to provide">
            <ul className="space-y-2">
              {pkg.inputs.map((i) => (
                <li key={i} className="flex gap-2.5 text-[14.5px] text-ink-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" /> {i}
                </li>
              ))}
            </ul>
          </Block>
          <div className="flex flex-wrap gap-1.5">
            {pkg.specializations.map((s) => (
              <Badge key={s} tone="outline">{specName(s)}</Badge>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="eyebrow">Operators offering this package</div>
          {offers.length === 0 && (
            <Card className="p-5 text-[13.5px] leading-relaxed text-muted">
              No operator has listed this package yet. Describe your version of it and we&rsquo;ll match you directly.
              <ButtonLink href={`/match?q=${encodeURIComponent(pkg.title + ": " + pkg.tagline)}`} className="mt-4 w-full">
                Scope it with AI Match <ArrowRight className="size-4" />
              </ButtonLink>
            </Card>
          )}
          {offers.map(({ service, op }) => (
            <Card key={service.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar name={op.name} fileId={op.avatarFileId} size={42} />
                <div className="min-w-0 flex-1">
                  <Link href={`/operators/${op.handle}`} className="flex items-center gap-1.5 font-semibold hover:underline">
                    {op.name}
                    {op.verifiedCount > 0 && <BadgeCheck className="size-4 text-ok" aria-label="Verified credentials" />}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <AvailabilityDot value={op.availability} />
                    {op.isSample && <SampleBadge />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-lg font-semibold">{formatMoney(service.priceCents)}</div>
                  <div className="text-[12px] text-muted">{Math.round(service.timelineDays / 7)} weeks</div>
                </div>
              </div>
              <div className="mt-4 border-t border-line pt-4">
                {op.isSample ? (
                  <p className="text-[12.5px] text-muted">Sample listing: shows how offers appear. Not purchasable.</p>
                ) : user?.role === "company" ? (
                  <ServiceRequestForm serviceId={service.id} inputs={pkg.inputs} />
                ) : user ? (
                  <p className="text-[12.5px] text-muted">Sign in with a company account to request this package.</p>
                ) : (
                  <ButtonLink href={`/signup?next=/services/${pkg.slug}`} variant="signal" className="w-full">
                    Request this package
                  </ButtonLink>
                )}
              </div>
            </Card>
          ))}
        </aside>
      </Section>

      {alsoQualified.length > 0 && (
        <Section className="pb-6">
          <h2 className="text-xl font-semibold tracking-tight">Also qualified for this work</h2>
          <p className="mt-1 text-sm text-muted">These operators list the required capabilities but haven&rsquo;t packaged it. Request a custom proposal.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alsoQualified.map((m) => (
              <OperatorCard key={m.operator.id} op={m.operator} reasons={m.reasons} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-[19px] font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-card text-ink-2">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
