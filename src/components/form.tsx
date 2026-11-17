"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./ui";

export function SubmitButton({ children, pendingLabel, variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { pendingLabel?: string; variant?: ButtonVariant; size?: ButtonSize }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} aria-busy={pending} className={buttonClass(variant, size, className)} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-bad/20 bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-[13px] text-ok">
      {message}
    </p>
  );
}
