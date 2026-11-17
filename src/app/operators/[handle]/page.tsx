import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowUpRight, BadgeCheck, Clock, ExternalLink, Globe, MapPin, Star } from "lucide-react";
import { getOperatorProfile, showSamples } from "@/lib/queries";
import { getCompanyForUser, getUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { specName, functionName, industryName, VERIFICATION_KINDS, EXPERIENCE_LEVELS } from "@/lib/taxonomy";
import { formatDate, formatMoney } from "@/lib/utils";
import { config } from "@/lib/config";
import { track } from "@/lib/analytics";
import { Avatar } from "@/components/brand";
import { AvailabilityDot, SampleBadge } from "@/components/cards";
import { Badge, ButtonLink, Card, Chip, Notice, Section } from "@/components/ui";
import { ShareButtons } from "@/components/share";
import { InviteForm, ServiceRequestForm } from "@/components/hire-forms";

type Params = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const profile = await getOperatorProfile(handle);
  if (!profile) return null;
  const user = await getUser();
  const isOwner = Boolean(user && profile.op.userId === user.id);
  const isAdmin = user?.role === "admin";
  const listed = profile.op.status === "approved" && (!profile.op.isSample || (await showSamples()));
  if (!listed && !isOwner && !isAdmin) return null;
  return { ...profile, user, isOwner, isAdmin, listed };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const p = await getOperatorProfile(handle);
  if (!p || p.op.status !== "approved") return { title: "Operator" };
  return {
    title: `${p.op.name}: ${p.op.headline}`,
    description: p.op.bio.slice(0, 160),
    openGraph: { title: `${p.op.name} on Operators`, description: p.op.headline },
  };
}

export default async function OperatorProfilePage({ params }: Params) {
  const { handle } = await params;
  const data = await load(handle);
  if (!data) notFound();
  const { op, portfolio, verifications, services, reviews, stories, user, isOwner, isAdmin, listed } = data;

  if (!isOwner && !isAdmin) await track("profile_view", { operatorId: op.id }, user?.id);

  let companyBriefs: { id: string; title: string }[] = [];
  if (user?.role === "company") {
    const company = await getCompanyForUser(user.id);
    if (company) {
      companyBriefs = await db.select({ id: schema.briefs.id, title: schema.briefs.title }).from(schema.briefs).where(and(eq(schema.briefs.companyId, company.id), eq(schema.briefs.status, "open")));
    }
  }

  const shareUrl = isOwner && user ? `${config.appUrl}/r/${user.referralCode}?to=/operators/${op.handle}` : `${config.appUrl}/operators/${op.handle}`;
  const allMetrics = portfolio.flatMap((p) => p.metrics.map((m) => ({ ...m, project: p.title }))).slice(0, 4);
  const level = EXPERIENCE_LEVELS.find((l) => l.slug === op.experienceLevel);

  return (
    <>
      {!listed && (
        <div className="border-b border-warn/20 bg-warn-soft">
          <Section className="py-3 text-sm text-warn">
            Preview: this profile is <strong>{op.status}</strong> and not publicly visible yet.{" "}
            {isOwner && (
              <Link href="/onboarding" className="link font-medium">
                Continue onboarding
              </Link>
            )}
          </Section>
        </div>
      )}
      <div className="border-b border-line bg-card/40">
        <Section className="py-10 sm:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar name={op.name} fileId={op.avatarFileId} size={96} className="ring-4 ring-card" />
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">{op.name}</h1>
                  {op.isSample && <SampleBadge />}
                </div>
                <p className="mt-2 text-[17px] leading-snug text-ink-2">{op.headline}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
                  {op.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden /> {op.location}
                      {op.timezone && ` · ${op.timezone}`}
                    </span>
                  )}
                  <AvailabilityDot value={op.availability} />
                  {op.yearsExperience != null && <span>{op.yearsExperience} years building</span>}
                  {level && <span>{level.name} operator</span>}
                  {op.avgRating != null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-signal text-signal" aria-hidden />
                      {op.avgRating.toFixed(1)} ({op.reviewCount})
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {op.verifiedCount > 0 ? (
                    <Badge tone="ok">
                      <BadgeCheck className="size-3.5" aria-hidden /> {op.verifiedCount} admin-verified {op.verifiedCount === 1 ? "credential" : "credentials"}
                    </Badge>
                  ) : (
                    <Badge tone="outline">No verified credentials yet</Badge>
                  )}
                  {op.completedCount > 0 && <Badge>{op.completedCount} completed on Operators</Badge>}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <ShareButtons url={shareUrl} text={`${op.name}: ${op.headline}`} kind="profile" />
              {isOwner && <ButtonLink href="/onboarding" variant="ghost" size="sm">Edit profile</ButtonLink>}
            </div>
          </div>
        </Section>
      </div>

      <Section className="grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-12">
          {op.isSample && (
            <Notice tone="neutral" title="This is a sample listing">
              Created by the Operators team to demonstrate profiles. The person, projects, and metrics are illustrative and it cannot be hired. Real operators carry no sample label.
            </Notice>
          )}

          <ProfileSection title="About">
            <p className="whitespace-pre-line text-[15.5px] leading-relaxed text-ink-2">{op.bio || "No bio yet."}</p>
          </ProfileSection>

          {allMetrics.length > 0 && (
            <ProfileSection title="Measured outcomes" note={op.isSample ? "Illustrative" : "Self-reported by the operator unless backed by a verified credential"}>
              <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {allMetrics.map((m, i) => (
                  <div key={i} className="bg-card p-5">
                    <div className="eyebrow">{m.label}</div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span className="tabular text-base text-faint line-through decoration-1">{m.before}</span>
                      <span className="text-signal" aria-hidden>→</span>
                      <span className="tabular text-[28px] font-semibold tracking-tight">{m.after}</span>
                    </div>
                    <div className="mt-2 truncate text-[12px] text-muted">{m.project}</div>
                  </div>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection title="Portfolio & demos">
            {portfolio.length === 0 ? (
              <p className="text-sm text-muted">No portfolio projects yet.</p>
            ) : (
              <div className="space-y-4">
                {portfolio.map((p) => (
                  <Card key={p.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[17px] font-semibold tracking-tight">{p.title}</h3>
                        {p.summary && <p className="mt-1 text-[14px] text-muted">{p.summary}</p>}
                      </div>
                      {p.demoUrl && (
                        <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1 text-[12.5px] font-medium hover:border-line-strong">
                          Demo <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                    {(p.problem || p.solution) && (
                      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                        {p.problem && (
                          <div>
                            <dt className="eyebrow">Problem</dt>
                            <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{p.problem}</dd>
                          </div>
                        )}
                        {p.solution && (
                          <div>
                            <dt className="eyebrow">What was built</dt>
                            <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{p.solution}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    {p.tools.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {p.tools.map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ProfileSection>

          {stories.length > 0 && (
            <ProfileSection title="Published case studies">
              <div className="grid gap-3 sm:grid-cols-2">
                {stories.map((s) => (
                  <Link key={s.id} href={`/stories/${s.slug}`} className="group rounded-2xl border border-line bg-card p-5 shadow-card hover:shadow-lift">
                    <div className="flex items-center justify-between">
                      {s.isSample ? <Badge tone="outline" className="border-dashed">Illustrative</Badge> : <Badge tone="ok">Client-approved</Badge>}
                      <ArrowUpRight className="size-4 text-faint group-hover:text-ink" />
                    </div>
                    <div className="mt-4 font-semibold tracking-tight">{s.title}</div>
                    <div className="mt-1 text-[13px] text-muted">{s.clientLabel}</div>
                  </Link>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection title="Verified credentials" note="Each item was reviewed by an Operators admin">
            {verifications.length === 0 ? (
              <p className="text-sm text-muted">{op.isSample ? "Sample listings are never verified." : "No credentials have been verified yet. Claims elsewhere on this profile are self-reported."}</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                {verifications.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 p-4">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{v.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {VERIFICATION_KINDS.find((k) => k.slug === v.kind)?.name} · verified {formatDate(v.reviewedAt)}
                      </div>
                    </div>
                    {v.evidenceUrl && v.kind !== "reference" && v.kind !== "identity" && (
                      <a href={v.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[12.5px] font-medium text-ink-2 hover:text-ink">
                        Evidence ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ProfileSection>

          <ProfileSection title="Reviews">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews yet. Reviews can only be left by companies after a completed project on Operators.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line bg-card p-5">
                    <div className="flex items-center gap-1" aria-label={`${r.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={i < r.rating ? "size-4 fill-signal text-signal" : "size-4 text-line-strong"} aria-hidden />
                      ))}
                    </div>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">“{r.body}”</p>
                    <div className="mt-3 text-[12.5px] text-muted">
                      {r.authorLabel} · {formatDate(r.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ProfileSection>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="eyebrow">Rate</div>
                <div className="tabular mt-1 text-2xl font-semibold tracking-tight">{op.hourlyRateCents ? `${formatMoney(op.hourlyRateCents)}/hr` : "By project"}</div>
              </div>
              {op.minProjectCents && <div className="text-right text-[12.5px] text-muted">Projects from {formatMoney(op.minProjectCents)}</div>}
            </div>
            {op.hoursPerWeek && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                <Clock className="size-3.5" aria-hidden /> ~{op.hoursPerWeek} hrs/week available
              </div>
            )}
            <div className="mt-5 border-t border-line pt-5">
              {op.isSample ? (
                <div className="space-y-3">
                  <p className="text-[13px] text-muted">Sample listings can&rsquo;t be hired. Describe your project and we&rsquo;ll match you with real operators.</p>
                  <ButtonLink href="/match" className="w-full">Find a real operator</ButtonLink>
                </div>
              ) : !user ? (
                <div className="space-y-2">
                  <ButtonLink href={`/signup?next=/operators/${op.handle}`} className="w-full">Request a proposal</ButtonLink>
                  <p className="text-center text-[12px] text-muted">Free company account. No commitment.</p>
                </div>
              ) : user.role === "company" ? (
                <InviteForm operatorId={op.id} operatorName={op.name} briefs={companyBriefs} />
              ) : (
                <p className="text-[13px] text-muted">Sign in with a company account to hire {op.name.split(" ")[0]}.</p>
              )}
            </div>
          </Card>

          {services.length > 0 && (
            <Card className="p-5">
              <div className="eyebrow mb-3">Fixed-price services</div>
              <div className="space-y-3">
                {services.map(({ service, pkg }) => (
                  <details key={service.id} className="group rounded-xl border border-line p-3.5 open:bg-paper/50">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-semibold leading-snug">{service.title}</div>
                        <div className="mt-0.5 text-[12px] text-muted">{Math.round(service.timelineDays / 7)} weeks · {service.deliverables.length} deliverables</div>
                      </div>
                      <div className="tabular shrink-0 font-semibold">{formatMoney(service.priceCents)}</div>
                    </summary>
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {service.deliverables.map((d) => (
                        <li key={d} className="flex gap-2 text-[12.5px] text-ink-2">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" /> {d}
                        </li>
                      ))}
                    </ul>
                    {pkg && (
                      <Link href={`/services/${pkg.slug}`} className="mt-3 inline-block text-[12.5px] font-medium text-ink-2 hover:text-ink">
                        Package details →
                      </Link>
                    )}
                    {user?.role === "company" && !op.isSample && (
                      <div className="mt-4">
                        <ServiceRequestForm serviceId={service.id} inputs={pkg?.inputs ?? []} />
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-4 p-5">
            <TagGroup label="Specializations" items={op.specializations.map(specName)} />
            <TagGroup label="Functions" items={op.functions.map(functionName)} />
            <TagGroup label="Industries" items={op.industries.map((i) => industryName(i))} />
            <TagGroup label="Tool stack" items={op.tools} />
            {op.links.length > 0 && (
              <div>
                <div className="eyebrow mb-2">Links</div>
                <ul className="space-y-1.5">
                  {op.links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
                        <Globe className="size-3.5" aria-hidden /> {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </aside>
      </Section>
    </>
  );
}

function ProfileSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
        {note && <span className="text-[12px] text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>
    </div>
  );
}
