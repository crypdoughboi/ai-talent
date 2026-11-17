import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getUser } from "@/lib/auth";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const { role, next } = await searchParams;
  if (await getUser()) redirect("/dashboard");
  const isOperator = role === "operator";
  return (
    <AuthShell
      title={isOperator ? "Join the operator network" : "Start your AI transformation"}
      subtitle={isOperator ? "Build a profile that proves what you've shipped. Approval is reviewed by a human." : "Describe problems, get scoped briefs, and hire vetted operators."}
      aside={
        <div className="flex h-full min-h-[440px] flex-col justify-between">
          <div className="eyebrow !text-paper/50">{isOperator ? "For operators" : "For companies"}</div>
          <ul className="space-y-5">
            {(isOperator
              ? ["Get matched on evidence, not keywords", "Sell fixed-price outcome packages", "Publish client-approved case studies", "Keep 85% of every project"]
              : ["Plain-English problem to scoped brief in seconds", "Matches grounded in real, reviewed profiles", "Milestone-based payments via Stripe", "Track projected vs. documented impact"]
            ).map((t) => (
              <li key={t} className="flex items-start gap-3 text-lg tracking-tight">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-signal text-ink">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <SignUpForm defaultRole={isOperator ? "operator" : "company"} next={next} />
    </AuthShell>
  );
}
