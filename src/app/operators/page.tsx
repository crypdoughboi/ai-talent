import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { OperatorCard } from "@/components/cards";
import { AutoSubmitForm } from "@/components/auto-submit";
import { WaitlistForm } from "@/app/apply/waitlist";
import { ButtonLink, EmptyState, Input, PageHeader, Section, Select } from "@/components/ui";
import { getListedOperators } from "@/lib/queries";
import { AVAILABILITY, EXPERIENCE_LEVELS, FUNCTIONS, INDUSTRIES, SPECIALIZATIONS, TOOLS } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "Discover AI operators", description: "Browse vetted AI-native operators by specialization, industry, tools, budget, and availability." };

type SP = { q?: string; spec?: string; function?: string; industry?: string; tool?: string; budget?: string; availability?: string; level?: string; verified?: string; sort?: string };

const BUDGETS = [
  { v: "100", label: "Up to $100/hr" },
  { v: "150", label: "Up to $150/hr" },
  { v: "200", label: "Up to $200/hr" },
];

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = await getListedOperators();
  const q = (sp.q ?? "").toLowerCase().trim();
  let ops = all.filter((o) => {
    if (q && ![o.name, o.headline, o.bio, ...o.tools].join(" ").toLowerCase().includes(q)) return false;
    if (sp.spec && !o.specializations.includes(sp.spec)) return false;
    if (sp.function && !o.functions.includes(sp.function)) return false;
    if (sp.industry && !o.industries.includes(sp.industry)) return false;
    if (sp.tool && !o.tools.includes(sp.tool)) return false;
    if (sp.budget && (o.hourlyRateCents == null || o.hourlyRateCents > Number(sp.budget) * 100)) return false;
    if (sp.availability && o.availability !== sp.availability) return false;
    if (sp.level && o.experienceLevel !== sp.level) return false;
    if (sp.verified === "1" && o.verifiedCount === 0) return false;
    return true;
  });
  if (sp.sort === "rate-asc") ops = [...ops].sort((a, b) => (a.hourlyRateCents ?? 1e9) - (b.hourlyRateCents ?? 1e9));
  if (sp.sort === "rate-desc") ops = [...ops].sort((a, b) => (b.hourlyRateCents ?? 0) - (a.hourlyRateCents ?? 0));
  if (sp.sort === "experience") ops = [...ops].sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));

  const active = Object.entries(sp).filter(([k, v]) => v && k !== "sort").length;

  return (
    <Section>
      <PageHeader
        eyebrow={`${all.length} listed operators`}
        title="Discover operators"
        description="Filter by what you need done. Every profile shows shipped work, tools, rates, and which claims an admin has verified."
        actions={<ButtonLink href="/match" variant="signal">Describe a problem instead</ButtonLink>}
      />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <AutoSubmitForm className="space-y-4 rounded-2xl border border-line bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4" aria-hidden /> Filters
              </span>
              {active > 0 && (
                <Link href="/operators" className="text-[12.5px] text-muted hover:text-ink">
                  Clear all
                </Link>
              )}
            </div>
            <FilterLabel label="Search">
              <Input name="q" defaultValue={sp.q} placeholder="Name, skill, tool…" className="h-10" />
            </FilterLabel>
            <FilterSelect name="spec" label="Specialization" value={sp.spec} options={SPECIALIZATIONS.map((s) => ({ v: s.slug, label: s.name }))} />
            <FilterSelect name="function" label="Business function" value={sp.function} options={FUNCTIONS.map((s) => ({ v: s.slug, label: s.name }))} />
            <FilterSelect name="industry" label="Industry" value={sp.industry} options={INDUSTRIES.map((s) => ({ v: s.slug, label: s.name }))} />
            <FilterSelect name="tool" label="Tool" value={sp.tool} options={TOOLS.map((t) => ({ v: t, label: t }))} />
            <FilterSelect name="budget" label="Budget" value={sp.budget} options={BUDGETS} />
            <FilterSelect name="availability" label="Availability" value={sp.availability} options={AVAILABILITY.map((a) => ({ v: a.slug, label: a.name }))} />
            <FilterSelect name="level" label="Experience" value={sp.level} options={EXPERIENCE_LEVELS.map((a) => ({ v: a.slug, label: `${a.name}: ${a.description}` }))} />
            <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
              <input type="checkbox" name="verified" value="1" defaultChecked={sp.verified === "1"} className="size-4 accent-[#131311]" />
              Has admin-verified credentials
            </label>
            <noscript>
              <button className="h-9 w-full rounded-full bg-ink text-sm text-paper">Apply filters</button>
            </noscript>
            {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          </AutoSubmitForm>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {ops.length} {ops.length === 1 ? "operator" : "operators"}
              {active > 0 ? " match your filters" : ""}
            </p>
            <AutoSubmitForm className="flex items-center gap-2">
              {Object.entries(sp)
                .filter(([k, v]) => v && k !== "sort")
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              <label htmlFor="sort" className="text-[12.5px] text-muted">
                Sort
              </label>
              <Select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="h-9 w-auto rounded-full text-[13px]">
                <option value="">Recommended</option>
                <option value="rate-asc">Rate: low to high</option>
                <option value="rate-desc">Rate: high to low</option>
                <option value="experience">Most experience</option>
              </Select>
            </AutoSubmitForm>
          </div>
          {ops.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="No operators match these filters"
              description="We're a curated network, so some combinations are still filling up. Describe your problem and the curation team will source someone for it."
              action={
                <div className="space-y-6">
                  <div className="flex flex-wrap justify-center gap-2">
                    <ButtonLink href="/operators" variant="secondary">Clear filters</ButtonLink>
                    <ButtonLink href="/match">Describe the problem</ButtonLink>
                  </div>
                  <div className="mx-auto max-w-sm text-left">
                    <p className="mb-2 text-[12.5px] text-muted">Or get notified when we add operators for this:</p>
                    <WaitlistForm kind="company" />
                  </div>
                </div>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ops.map((op) => (
                <OperatorCard key={op.id} op={op} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: { v: string; label: string }[] }) {
  return (
    <FilterLabel label={label}>
      <Select name={name} defaultValue={value ?? ""} className="h-10">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </Select>
    </FilterLabel>
  );
}
