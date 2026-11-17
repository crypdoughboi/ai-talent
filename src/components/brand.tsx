import Link from "next/link";
import { cn, hashString, initials } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#131311" />
      <circle cx="16" cy="16" r="7.25" fill="none" stroke="#f5f4ef" strokeWidth="3" />
      <rect x="19.5" y="6.5" width="6" height="6" rx="1.5" fill="#ff4f00" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Operators home">
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-8deg]" />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">operators</span>
    </Link>
  );
}

const SWATCHES = [
  ["#e9e3d5", "#5b4a2b"],
  ["#dfe6df", "#2f4a39"],
  ["#e2e2ea", "#363a5c"],
  ["#eadfdb", "#5e3328"],
  ["#dde5e8", "#28495a"],
  ["#e8e4dc", "#45413a"],
  ["#e6e0ea", "#4b3659"],
];

export function Avatar({ name, fileId, size = 44, className, ring }: { name: string; fileId?: string | null; size?: number; className?: string; ring?: boolean }) {
  const [bg, fg] = SWATCHES[hashString(name) % SWATCHES.length];
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  if (fileId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${fileId}`} alt="" width={size} height={size} style={style} className={cn("shrink-0 rounded-full object-cover", ring && "ring-2 ring-card", className)} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: bg, color: fg }}
      className={cn("relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight", ring && "ring-2 ring-card", className)}
    >
      <svg className="absolute inset-0 size-full opacity-[0.18]" viewBox="0 0 40 40" aria-hidden>
        <circle cx={8 + (hashString(name + "x") % 24)} cy={8 + (hashString(name + "y") % 24)} r="16" fill="none" stroke={fg} strokeWidth="1" />
      </svg>
      <span className="relative">{initials(name)}</span>
    </span>
  );
}
