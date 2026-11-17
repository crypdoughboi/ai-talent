import type { Metadata } from "next";
import { PackageCard } from "@/components/cards";
import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { getActivePackages, getPackageOfferCounts } from "@/lib/queries";
import { FUNCTIONS } from "@/lib/taxonomy";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hire by outcome", description: "Fixed-scope AI transformation packages with clear deliverables, timelines, and starting prices." };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ function?: string }> }) {
  const { function: fn } = await searchParams;
  const [packages, counts] = await Promise.all([getActivePackages(), getPackageOfferCounts()]);
  const shown = fn ? packages.filter((p) => p.function === fn) : packages;
  const fns = FUNCTIONS.filter((f) => packages.some((p) => p.function === f.slug));
  return (
    <Section>
      <PageHeader
        eyebrow="Hire by outcome"
        title={<>Buy the outcome, <span className="serif-accent text-signal">not the hours.</span></>}
        description="Productized transformation projects with defined scope, deliverables, timeline, and a starting price. Pick a package, pick an operator, and get a confirmed scope before anything is charged."
        actions={<ButtonLink href="/match" variant="secondary">Need something custom?</ButtonLink>}
      />
      <nav aria-label="Filter by function" className="-mx-1 mb-8 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterPill href="/services" active={!fn}>All</FilterPill>
        {fns.map((f) => (
          <FilterPill key={f.slug} href={`/services?function=${f.slug}`} active={fn === f.slug}>
            {f.name}
          </FilterPill>
        ))}
      </nav>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <PackageCard key={p.id} pkg={p} offers={counts.get(p.id) ?? 0} />
        ))}
      </div>
    </Section>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-line-strong")}>
      {children}
    </Link>
  );
}
