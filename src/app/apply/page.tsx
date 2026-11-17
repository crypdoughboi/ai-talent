import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Coins, Megaphone, PackageCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { SPECIALIZATIONS } from "@/lib/taxonomy";
import { ButtonLink, Card, Section } from "@/components/ui";
import { WaitlistForm } from "./waitlist";

export const metadata: Metadata = { title: "Become an operator", description: "Join a curated network of AI-native operators. Get matched on evidence, sell outcomes, keep 85%." };

export default async function ApplyPage() {
  const user = await getUser();
  const keep = 100 - config.platformFeeBps / 100;
  const cta = user?.role === "operator" ? { href: "/onboarding", label: "Continue your profile" } : user ? { href: "/dashboard", label: "Go to dashboard" } : { href: "/signup?role=operator", label: "Start your application" };
  return (
    <>
      <Section className="pb-16 pt-14 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <div className="eyebrow">For AI-native talent · founding cohort</div>
            <h1 className="display mt-4 text-[44px] sm:text-[72px]">
              Get hired for what you can <span className="serif-accent text-signal">actually build.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Self-taught power user or senior ML engineer, it doesn&rsquo;t matter here. If you can ship AI systems that change how a business runs, we want to put you in front of the companies that need you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={cta.href} size="lg">{cta.label} <ArrowRight className="size-4" /></ButtonLink>
              <ButtonLink href="/how-it-works#vetting" size="lg" variant="secondary">How vetting works</ButtonLink>
            </div>
          </div>
          <Card className="p-6">
            <div className="eyebrow">We&rsquo;re recruiting for</div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {SPECIALIZATIONS.map((s) => <span key={s.slug} className="rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2">{s.name}</span>)}
            </div>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, t: "Evidence beats résumés", d: "Show demos, deployments, and quantified outcomes. Earn verified badges for what we confirm." },
            { icon: PackageCheck, t: "Sell outcomes", d: "List fixed-price services like “Automate invoice processing” and get requested directly." },
            { icon: Coins, t: `Keep ${keep}%`, d: "Milestone payments via Stripe Connect. No bidding wars, no hourly race to the bottom." },
            { icon: Megaphone, t: "A profile worth sharing", d: "A public portfolio and client-approved case studies you'll want on LinkedIn and your site." },
          ].map((x) => (
            <Card key={x.t} className="p-6">
              <x.icon className="size-5 text-signal" />
              <h3 className="mt-6 font-semibold">{x.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{x.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="pt-20">
        <div className="grid gap-10 rounded-[28px] border border-line bg-card p-8 shadow-card sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-[28px] font-semibold leading-tight tracking-tight">What we look for</h2>
            <ul className="mt-6 space-y-4 text-[15px] text-ink-2">
              {["At least one AI system you built that someone actually uses", "Clear thinking about where humans stay in the loop", "Honest, measurable outcomes (even small ones)", "Communication a busy client can rely on"].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-signal" /> {t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight">Not ready to apply?</h2>
            <p className="mt-2 text-[14px] text-muted">Join the list and we&rsquo;ll let you know when new categories open.</p>
            <div className="mt-5"><WaitlistForm kind="operator" /></div>
          </div>
        </div>
      </Section>
    </>
  );
}
