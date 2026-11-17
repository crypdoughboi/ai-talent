import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/inbox";
import { Logo } from "./brand";
import { ButtonLink } from "./ui";
import { MobileMenu, NavLinks, UserMenu } from "./site-nav-client";

export const NAV_LINKS = [
  { href: "/operators", label: "Operators" },
  { href: "/services", label: "Hire by outcome" },
  { href: "/match", label: "AI Match" },
  { href: "/diagnostic", label: "Diagnostic" },
  { href: "/stories", label: "Stories" },
];

export async function SiteNav() {
  const user = await getUser();
  const unread = user && user.role !== "admin" ? await getUnreadCount(user) : 0;
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden flex-1 lg:block">
          <NavLinks links={NAV_LINKS} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden h-9 items-center rounded-full px-3.5 text-sm font-medium text-ink-2 hover:bg-paper-2 hover:text-ink sm:inline-flex">
                Dashboard
              </Link>
              {user.role !== "admin" && (
                <Link href="/messages" className="relative hidden h-9 items-center rounded-full px-3.5 text-sm font-medium text-ink-2 hover:bg-paper-2 hover:text-ink sm:inline-flex">
                  Messages
                  {unread > 0 && (
                    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-signal px-1.5 text-[11px] font-semibold text-ink" aria-label={`${unread} unread`}>
                      {unread}
                    </span>
                  )}
                </Link>
              )}
              <UserMenu name={user.name} role={user.role} />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden h-9 items-center rounded-full px-3.5 text-sm font-medium text-ink-2 hover:bg-paper-2 hover:text-ink sm:inline-flex">
                Sign in
              </Link>
              <ButtonLink href="/match" size="sm" className="hidden sm:inline-flex">
                Find an operator
              </ButtonLink>
            </>
          )}
          <MobileMenu links={NAV_LINKS} signedIn={Boolean(user)} unread={unread} isAdmin={user?.role === "admin"} />
        </div>
      </div>
    </header>
  );
}
