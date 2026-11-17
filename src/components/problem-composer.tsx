"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { BriefSummary, requestBrief, ScopingProgress, type BriefResponse } from "./brief-result";
import { buttonClass } from "./ui";
import { cn } from "@/lib/utils";

export const EXAMPLES = [
  "We spend 20 hours every week manually reviewing contracts.",
  "We're a 50-person law firm looking to automate document review and client intake.",
  "Our 6-person support team answers the same questions all day in Zendesk.",
  "Finance keys about 400 invoices a month into QuickBooks by hand, roughly 25 hours a week.",
  "Reps spend half their day researching leads and updating HubSpot.",
];

export function ProblemComposer() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BriefResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(problem: string) {
    const p = problem.trim();
    if (p.length < 12) {
      setError("Describe the problem in a sentence or two, for example how much time it takes today.");
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const [res] = await Promise.all([requestBrief(p), new Promise((r) => setTimeout(r, 900))]);
      setData(res);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function continueInMatch() {
    try {
      if (data) sessionStorage.setItem("ops:brief", JSON.stringify(data));
    } catch {}
    router.push(`/match?from=home`);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
        }}
        className="group relative rounded-[22px] border border-line-strong bg-card p-2 shadow-lift transition-shadow focus-within:shadow-pop"
      >
        <label htmlFor="problem" className="sr-only">
          Describe a business problem
        </label>
        <textarea
          id="problem"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(value);
          }}
          rows={3}
          maxLength={3000}
          placeholder="Describe a problem in plain English. e.g. “We spend 20 hours every week manually reviewing contracts.”"
          className="block w-full resize-none rounded-2xl bg-transparent px-4 pb-2 pt-3.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <span className="hidden items-center gap-1.5 text-[12px] text-faint sm:flex">
            <CornerDownLeft className="size-3" aria-hidden /> ⌘/Ctrl + Enter
          </span>
          <button type="submit" disabled={loading} className={buttonClass("primary", "md", "ml-auto")}>
            {loading ? "Scoping…" : "Scope it"}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Example problems">
        {EXAMPLES.slice(0, 3).map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              run(ex);
            }}
            className="rounded-full border border-line bg-card/70 px-3 py-1.5 text-left text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:bg-card"
          >
            {ex.length > 62 ? ex.slice(0, 60) + "…" : ex}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-bad">
          {error}
        </p>
      )}

      <div ref={resultRef} className={cn("scroll-mt-24", (loading || data) && "mt-8")}>
        {loading && <ScopingProgress />}
        {data && !loading && (
          <BriefSummary
            data={data}
            compact
            footer={
              <div className="grid gap-2">
                <button type="button" onClick={continueInMatch} className={buttonClass("signal", "md", "w-full")}>
                  Edit, save & invite operators <ArrowRight className="size-4" />
                </button>
                <p className="text-center text-[11.5px] text-muted">Free to scope. No commitment until you accept a proposal.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
