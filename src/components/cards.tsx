import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clock, Star } from "lucide-react";
import type { OperatorListItem } from "@/lib/queries";
import type { schema } from "@/lib/db";
import { specName, functionName } from "@/lib/taxonomy";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar } from "./brand";
import { Badge, Chip } from "./ui";

export function AvailabilityDot({ value, withLabel = true }: { value: "available" | "limited" | "booked"; withLabel?: boolean }) {
  const map = {
    available: { label: "Available now", cls: "bg-ok", pulse: true },
    limited: { label: "Limited capacity", cls: "bg-warn", pulse: false },
    booked: { label: "Booked", cls: "bg-faint", pulse: false },
  }[value];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
      <span className={cn("size-2 rounded-full", map.cls, map.pulse && "animate-pulse-dot")} aria-hidden />
      {withLabel && map.label}
    </span>
  );
}

export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="outline" className={cn("border-dashed", className)}>
      Sample listing
    </Badge>
  );
}

export function VerifiedBadge({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <Badge tone="ok">
      <BadgeCheck className="size-3.5" aria-hidden />
      {count} verified
    </Badge>
  );
}

export function OperatorCard({ op, reasons, strength, className }: { op: OperatorListItem; reasons?: string[]; strength?: string; className?: string }) {
  return (
    <Link
      href={`/operators/${op.handle}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-line bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={op.name} fileId={op.avatarFileId} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{op.name}</h3>
            {op.verifiedCount > 0 && <BadgeCheck className="size-4 shrink-0 text-ok" aria-label="Has admin-verified credentials" />}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">
            {op.location}
            {op.yearsExperience ? ` · ${op.yearsExperience} yrs` : ""}
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </div>
      <p className="mt-4 line-clamp-2 min-h-[2.75rem] text-[14px] leading-snug text-ink-2">{op.headline}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {op.specializations.slice(0, 3).map((s) => (
          <Chip key={s}>{specName(s)}</Chip>
        ))}
      </div>
      {reasons && reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5 rounded-xl bg-paper px-3 py-2.5">
          {reasons.slice(0, 3).map((r) => (
            <li key={r} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <AvailabilityDot value={op.availability} />
        <div className="flex items-center gap-2 text-[12.5px]">
          {op.avgRating != null && (
            <span className="inline-flex items-center gap-1 text-ink-2">
              <Star className="size-3.5 fill-signal text-signal" aria-hidden />
              {op.avgRating.toFixed(1)}
            </span>
          )}
          <span className="tabular font-medium">
            {op.fromPriceCents ? `From ${formatMoney(op.fromPriceCents, { compact: true })}` : op.hourlyRateCents ? `${formatMoney(op.hourlyRateCents)}/hr` : ""}
          </span>
        </div>
      </div>
      {(op.isSample || strength) && (
        <div className="absolute -top-2.5 right-4 flex gap-1.5">
          {strength && <Badge tone={strength === "Strong match" ? "signal" : "neutral"}>{strength}</Badge>}
          {op.isSample && <SampleBadge className="bg-card" />}
        </div>
      )}
    </Link>
  );
}

type Pkg = typeof schema.packages.$inferSelect;

export function PackageCard({ pkg, offers, className }: { pkg: Pkg; offers?: number; className?: string }) {
  return (
    <Link
      href={`/services/${pkg.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">{functionName(pkg.function)}</span>
        <ArrowUpRight className="size-4 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </div>
      <h3 className="mt-5 text-[19px] font-semibold leading-snug tracking-tight">{pkg.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{pkg.tagline}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div>
          <div className="text-[11px] text-muted">Starting at</div>
          <div className="tabular text-lg font-semibold tracking-tight">{formatMoney(pkg.startingPriceCents)}</div>
        </div>
        <div className="text-right text-[12.5px] text-muted">
          <div className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {pkg.timelineMinWeeks}–{pkg.timelineMaxWeeks} weeks
          </div>
          {offers != null && <div className="mt-0.5">{offers === 0 ? "Matched on request" : `${offers} ${offers === 1 ? "operator" : "operators"} offering`}</div>}
        </div>
      </div>
    </Link>
  );
}
