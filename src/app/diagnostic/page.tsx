import type { Metadata } from "next";
import { Clock, FileBarChart, Share2 } from "lucide-react";
import { Section } from "@/components/ui";
import { DiagnosticWizard } from "./wizard";

export const metadata: Metadata = {
  title: "Free AI Transformation Diagnostic",
  description: "Answer a few questions and get a prioritized, shareable AI Opportunity Report for your company.",
};

export default function DiagnosticPage() {
  return (
    <Section className="grid gap-10 py-12 lg:grid-cols-[0.9fr_1.3fr] lg:py-16">
      <div className="lg:pt-6">
        <div className="eyebrow">Free · no account needed</div>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.02] tracking-tight sm:text-[52px]">
          Your AI <span className="serif-accent text-signal">Opportunity</span> Report
        </h1>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-2">
          Five quick steps. You&rsquo;ll get a ranked list of where AI can recover time in your business, a 90-day roadmap, and directional estimates you can share with your team.
        </p>
        <ul className="mt-8 space-y-4 text-[14px] text-ink-2">
          <li className="flex items-center gap-3"><Clock className="size-4 text-signal" /> About 3 minutes</li>
          <li className="flex items-center gap-3"><FileBarChart className="size-4 text-signal" /> Transparent math: every estimate shows its assumptions</li>
          <li className="flex items-center gap-3"><Share2 className="size-4 text-signal" /> A private, shareable link (anyone with it can view)</li>
        </ul>
      </div>
      <DiagnosticWizard />
    </Section>
  );
}
