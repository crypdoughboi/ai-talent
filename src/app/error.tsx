"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Section } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Section className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <div className="eyebrow">Something went wrong</div>
      <h1 className="mt-3 text-[36px] font-semibold tracking-tight">That didn&rsquo;t work.</h1>
      <p className="mt-3 max-w-md text-muted">
        {process.env.NODE_ENV !== "production" && error.message ? error.message : "The action couldn't be completed. Nothing was charged. Try again, or head back to your dashboard."}
      </p>
      {error.digest && <p className="mt-2 font-mono text-[12px] text-faint">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/dashboard" variant="secondary">Dashboard</ButtonLink>
      </div>
    </Section>
  );
}
