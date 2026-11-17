import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage briefs, proposals, and projects."
      aside={
        <div className="flex h-full min-h-[440px] flex-col justify-between">
          <div className="eyebrow !text-paper/50">Operators</div>
          <blockquote className="max-w-sm">
            <p className="text-[30px] leading-[1.15] tracking-tight">
              An AI-obsessed operator can create more value in <span className="serif-accent text-signal">two weeks</span> than a traditional engagement does in months.
            </p>
            <footer className="mt-6 text-sm text-paper/60">The idea this marketplace is built on.</footer>
          </blockquote>
        </div>
      }
    >
      <SignInForm next={next} />
    </AuthShell>
  );
}
