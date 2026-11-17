import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── Buttons ─────────────────────────── */

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,color,box-shadow,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 select-none";

const buttonVariants = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
  signal: "bg-signal text-ink hover:bg-[#ff6a26] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
  secondary: "bg-card text-ink border border-line hover:border-line-strong shadow-card",
  ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
  danger: "bg-card text-bad border border-bad/30 hover:bg-bad-soft",
  inverse: "bg-paper text-ink hover:bg-white",
} as const;

const buttonSizes = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ─────────────────────────── Badges ─────────────────────────── */

const tones = {
  neutral: "bg-paper-2 text-ink-2 border-line",
  outline: "bg-transparent text-ink-2 border-line-strong",
  signal: "bg-signal-soft text-signal-ink border-signal/20",
  ok: "bg-ok-soft text-ok border-ok/15",
  warn: "bg-warn-soft text-warn border-warn/15",
  bad: "bg-bad-soft text-bad border-bad/15",
  info: "bg-info-soft text-info border-info/15",
  ink: "bg-ink text-paper border-ink",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border border-line bg-card px-2 py-0.5 text-[12px] text-ink-2", className)}>{children}</span>;
}

/* ─────────────────────────── Surfaces ─────────────────────────── */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-card shadow-card", className)} {...props} />;
}

export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 pb-8 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-14", className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.05]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, className, align = "left" }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h2 className="text-[28px] font-semibold leading-[1.08] tracking-tight sm:text-[38px]">{title}</h2>
      {description && <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{description}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-card/50 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-card text-ink-2 shadow-card">{icon}</div>}
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className, icon }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div role="status" className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn("leading-relaxed", title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card p-5 shadow-card", className)}>
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-paper-2", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
    </div>
  );
}

/* ─────────────────────────── Form controls ─────────────────────────── */

const control =
  "w-full rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-faint hover:border-line-strong focus:border-ink focus:ring-4 focus:ring-ink/5 aria-[invalid=true]:border-bad sm:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2366645b%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}

export function Field({ label, hint, error, children, htmlFor, className, optional }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string; optional?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-faint">Optional</span>}
      </Label>
      {children}
      {error ? <p className="text-[12.5px] text-bad">{error}</p> : hint ? <p className="text-[12.5px] leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted shadow-card">{children}</kbd>;
}
