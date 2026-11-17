import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle: ReactNode; children: ReactNode; aside: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-16">
      <div className="mx-auto w-full max-w-md animate-rise lg:mx-0 lg:py-6">
        <h1 className="text-[32px] font-semibold leading-tight tracking-tight">{title}</h1>
        <p className="mb-8 mt-2 text-[15px] text-muted">{subtitle}</p>
        {children}
      </div>
      <aside className="relative hidden overflow-hidden rounded-[28px] bg-ink p-10 text-paper lg:block">
        <div className="grid-paper absolute inset-0 opacity-[0.12] invert" aria-hidden />
        <div className="relative">{aside}</div>
      </aside>
    </div>
  );
}
