"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut, LayoutGrid, Settings, Shield, MessageSquare, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/actions/auth";
import { Avatar } from "./brand";

type NavLink = { href: string; label: string };

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center rounded-full px-3 text-[13.5px] font-medium transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
              {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-signal" aria-hidden />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    ...(role !== "admin" ? [{ href: "/messages", label: "Messages", icon: MessageSquare }, { href: "/billing", label: "Billing", icon: Receipt }] : []),
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    { href: "/settings", label: "Settings & referrals", icon: Settings },
  ];

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-[13px] font-medium shadow-card transition-colors hover:border-line-strong"
      >
        <Avatar name={name} size={26} />
        <span className="max-w-28 truncate">{name.split(" ")[0]}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-60 animate-rise rounded-2xl border border-line bg-card p-1.5 shadow-pop">
          <div className="px-3 pb-2 pt-2">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="eyebrow mt-0.5">{role}</div>
          </div>
          <div className="my-1 border-t border-line" />
          {items.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-paper hover:text-ink">
              <i.icon className="size-4 text-muted" aria-hidden />
              {i.label}
            </Link>
          ))}
          <div className="my-1 border-t border-line" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-paper hover:text-ink">
              <LogOut className="size-4 text-muted" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ links, signedIn, unread, isAdmin }: { links: NavLink[]; signedIn: boolean; unread: number; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-9 items-center justify-center rounded-full border border-line bg-card shadow-card"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-50 animate-fade overflow-y-auto bg-paper px-4 pb-10 pt-4">
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center justify-between border-b border-line py-4 text-xl font-semibold tracking-tight">
                {l.label}
                <span className="text-faint">→</span>
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link href="/dashboard" className="border-b border-line py-4 text-xl font-semibold tracking-tight">Dashboard</Link>
                {!isAdmin && (
                  <Link href="/messages" className="border-b border-line py-4 text-xl font-semibold tracking-tight">
                    Messages {unread > 0 && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-sm">{unread}</span>}
                  </Link>
                )}
                {isAdmin && <Link href="/admin" className="border-b border-line py-4 text-xl font-semibold tracking-tight">Admin</Link>}
                <Link href="/settings" className="border-b border-line py-4 text-xl font-semibold tracking-tight">Settings</Link>
                <form action={signOutAction} className="mt-6">
                  <button className="h-12 w-full rounded-full border border-line bg-card font-medium">Sign out</button>
                </form>
              </>
            ) : (
              <div className="mt-6 grid gap-3">
                <Link href="/match" className="flex h-12 items-center justify-center rounded-full bg-ink font-medium text-paper">Find an AI operator</Link>
                <Link href="/apply" className="flex h-12 items-center justify-center rounded-full border border-line bg-card font-medium">Become an operator</Link>
                <Link href="/login" className="py-3 text-center text-sm font-medium text-muted">Sign in</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
