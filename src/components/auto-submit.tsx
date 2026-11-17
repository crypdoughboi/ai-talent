"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** GET form that updates the URL as filters change. Works as a normal form without JS. */
export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form).entries()) if (typeof v === "string" && v) params.set(k, v);
    const qs = params.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form
      ref={ref}
      method="get"
      className={cn(className, pending && "opacity-80")}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(submit, t.type === "text" || t.type === "search" ? 350 : 0);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {children}
    </form>
  );
}
