import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { Section } from "@/components/ui";
import { MatchStudio } from "./studio";

export const metadata: Metadata = {
  title: "AI Match: describe a problem, get a brief and operators",
  description: "Describe your business problem in plain English. Get a structured AI implementation brief and operators matched from real profiles.",
};

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getUser();
  return (
    <Section className="pb-10">
      <div className="pt-10 sm:pt-14">
        <div className="eyebrow">AI Match</div>
        <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[48px]">
          Tell us what&rsquo;s slowing you down. <span className="serif-accent text-signal">We&rsquo;ll scope it.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-muted">
          Describe the problem conversationally. You&rsquo;ll get an editable implementation brief and operators ranked only on what their reviewed profiles actually show.
        </p>
      </div>
      <MatchStudio initialProblem={q?.slice(0, 3000) ?? ""} role={user?.role ?? null} aiConfigured={config.ai.enabled} />
    </Section>
  );
}
