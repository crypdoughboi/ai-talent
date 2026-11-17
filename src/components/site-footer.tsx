import Link from "next/link";
import { Logo } from "./brand";

const COLS = [
  {
    title: "Companies",
    links: [
      { href: "/match", label: "Describe a problem" },
      { href: "/operators", label: "Browse operators" },
      { href: "/services", label: "Hire by outcome" },
      { href: "/diagnostic", label: "Free AI diagnostic" },
    ],
  },
  {
    title: "Operators",
    links: [
      { href: "/apply", label: "Apply to join" },
      { href: "/how-it-works#vetting", label: "How vetting works" },
      { href: "/stories", label: "Transformation stories" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/how-it-works#trust", label: "Trust & data" },
      { href: "/signup", label: "Create an account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            The people who make AI work. A curated network of AI-native operators, hired by outcome.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="eyebrow mb-4">{c.title}</div>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Operators. Listings marked “Sample” are illustrative demos, not real people.</span>
          <span>Estimates are directional and never a guarantee of results.</span>
        </div>
      </div>
    </footer>
  );
}
