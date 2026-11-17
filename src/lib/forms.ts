import { z } from "zod";

export type FormState = { error?: string | null; fieldErrors?: Record<string, string>; ok?: boolean; message?: string | null } | undefined;

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function list(fd: FormData, key: string) {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
}

export function csv(fd: FormData, key: string) {
  return str(fd, key)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function dollarsToCents(v: string) {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
