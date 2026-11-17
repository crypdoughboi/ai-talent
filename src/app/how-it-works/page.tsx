import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Database, EyeOff, FileLock2, Scale, ShieldCheck } from "lucide-react";
import { ButtonLink, Card, Section, SectionHeading } from "@/components/ui";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "How it works, vetting & trust", description: "How Operators scopes problems, vets talent on evidence, matches transparently, and handles payments and data." };

export default function HowItWorksPage() {
  const fee = config.platformFeeBps / 100;
  return (
    <>
      <Section className="pb-6 pt-14 sm:pt-20">
        <div className="eyebrow">How it works</div>
        <h1 className="display mt-4 max-w-4xl text-[42px] sm:text-[64px]">
          Outcomes over hours. <span className="serif-accent text-signal">Evidence over credentials.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">Operators is a curated marketplace for AI implementation. Here&rsquo;s exactly how scoping, vetting, matching, payments, and your data work.</p>
      </Section>

      <Section className="pt-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-8">
            <div className="eyebrow">For companies</div>
            <ol className="mt-6 space-y-6">
              {[
                ["Describe the problem", "Write it like you'd explain it to a colleague. AI Match turns it into a brief: the underlying problem, approaches, required capabilities, milestones, and a clearly labeled budget estimate. Everything is editable."],
                ["Compare matched operators", "Ranked on what their reviewed profiles show. Each match lists its reasons and gaps. Invite a few, or post the brief to the approved network."],
                ["Accept a proposal", "Operators propose fixed-price milestones. Accepting creates a project workspace with messages, files, deliverables, and invoices."],
                ["Fund milestone by milestone", "Each milestone is paid through Stripe when it starts and approved by you when delivered. No retainers."],
                ["Measure and share", "Compare projected and documented impact. If you choose, approve a before/after story for publication."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="font-mono text-[12px] text-signal-ink">0{i + 1}</span>
                  <div><div className="font-semibold">{t}</div><p className="mt-1 text-[14px] leading-relaxed text-muted">{d}</p></div>
                </li>
              ))}
            </ol>
            <ButtonLink href="/match" className="mt-8">Describe a problem <ArrowRight className="size-4" /></ButtonLink>
          </Card>
          <Card className="p-8">
            <div className="eyebrow">For operators</div>
            <ol className="mt-6 space-y-6">
              {[
                ["Apply with proof", "Build a profile around shipped systems: portfolio projects, demos, and quantified outcomes."],
                ["Get reviewed by a person", "Every application is reviewed before listing. Submit evidence to earn verified badges."],
                ["Receive leads", "Companies invite you to briefs, request your fixed-price services, or you propose on network briefs."],
                ["Deliver by milestone", "Submit deliverables, get approvals, and get paid per milestone."],
                ["Grow your reputation", `Reviews, documented impact, and client-approved stories build your profile. You keep ${100 - fee}% of every payment.`],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="font-mono text-[12px] text-signal-ink">0{i + 1}</span>
                  <div><div className="font-semibold">{t}</div><p className="mt-1 text-[14px] leading-relaxed text-muted">{d}</p></div>
                </li>
              ))}
            </ol>
            <ButtonLink href="/apply" variant="secondary" className="mt-8">Apply as an operator</ButtonLink>
          </Card>
        </div>
      </Section>

      <Section className="pt-24" id="vetting">
        <SectionHeading eyebrow="Vetting methodology" title="What every badge actually means" description="We separate what an operator says from what we've confirmed. Nothing is labeled verified until an admin has approved the specific evidence." />
        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-line bg-paper/60 text-[12px] text-muted">
              <tr><th className="px-5 py-3 font-medium">Label</th><th className="px-5 py-3 font-medium">What it means</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Approved listing", "A person reviewed the application, portfolio, and stated outcomes and found them credible enough to list."],
                ["Verified credential", "A specific item (production deployment, technical skill, client reference, or identity) was checked by an admin: we opened the evidence, ran the demo, or contacted the reference."],
                ["Self-reported", "Metrics and claims the operator provided that have not been independently confirmed. Shown as such."],
                ["Completed on Operators", "Projects delivered through the platform with all milestones approved by the client."],
                ["Client-confirmed impact", "Impact the operator documented and the client explicitly confirmed in the project workspace."],
                ["Sample listing / Illustrative", "Demo content created by the Operators team to show how the product works. Never hireable, never verified."],
              ].map(([l, d]) => (
                <tr key={l}><td className="w-56 px-5 py-4 align-top font-semibold">{l}</td><td className="px-5 py-4 text-muted">{d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section className="pt-24" id="trust">
        <SectionHeading eyebrow="Trust & data" title="Built to be handled with care" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: EyeOff, t: "Your documents stay private", d: "Project files are visible only to that project's participants and are never sent to an AI provider." },
            { icon: FileLock2, t: "Only what you type is analyzed", d: config.ai.enabled ? "AI Match sends only the problem description you type to our AI provider. Don't paste confidential material there." : "This deployment uses a deterministic rules engine; nothing you type leaves our servers." },
            { icon: BadgeCheck, t: "Grounded matching", d: "Operator matches are ranked by our own code over real profile fields. AI never invents operators or attributes expertise." },
            { icon: Scale, t: "Honest payments", d: `Milestones are paid through Stripe Checkout. We don't hold funds in escrow. The ${fee}% platform fee is deducted from the operator's side.` },
            { icon: ShieldCheck, t: "Secure accounts", d: "Passwords are hashed with scrypt, sessions are httpOnly cookies, and every sensitive action checks your role and ownership." },
            { icon: Database, t: "First-party analytics", d: "We measure usage with our own event log. No third-party ad trackers." },
          ].map((x) => (
            <Card key={x.t} className="p-6">
              <x.icon className="size-5 text-signal" />
              <h3 className="mt-5 font-semibold">{x.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{x.d}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
