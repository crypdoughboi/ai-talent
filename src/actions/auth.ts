"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession, destroySession, hashPassword, rateLimit, verifyPassword } from "@/lib/auth";
import { fieldErrors, str, type FormState } from "@/lib/forms";
import { newId, slugify } from "@/lib/utils";
import { track } from "@/lib/analytics";

const signupSchema = z.object({
  role: z.enum(["company", "operator"]),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  companyName: z.string().trim().max(120).optional(),
});

function safeNext(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function signUpAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("signup", 10, 60 * 60 * 1000))) return { error: "Too many sign-up attempts. Please try again later." };
  const parsed = signupSchema.safeParse({
    role: str(fd, "role"),
    name: str(fd, "name"),
    email: str(fd, "email"),
    password: fd.get("password"),
    companyName: str(fd, "companyName") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Please fix the highlighted fields." };
  const { role, name, email, password, companyName } = parsed.data;
  if (role === "company" && !companyName) return { fieldErrors: { companyName: "Tell us your company's name" } };

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length) return { fieldErrors: { email: "An account with this email already exists. Try signing in." } };

  const jar = await cookies();
  const refCode = jar.get("op_ref")?.value;
  let referredById: string | null = null;
  if (refCode) {
    const ref = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.referralCode, refCode)).limit(1);
    referredById = ref[0]?.id ?? null;
  }

  const userId = newId("usr");
  await db.insert(schema.users).values({
    id: userId,
    email,
    name,
    passwordHash: await hashPassword(password),
    role,
    referralCode: newId("", 8),
    referredById,
  });

  if (role === "company") {
    await db.insert(schema.companies).values({ id: newId("co"), ownerId: userId, name: companyName! });
  } else {
    let handle = slugify(name) || "operator";
    const taken = await db.select({ id: schema.operators.id }).from(schema.operators).where(eq(schema.operators.handle, handle)).limit(1);
    if (taken.length) handle = `${handle}-${newId("", 4)}`;
    await db.insert(schema.operators).values({ id: newId("op"), userId, handle, name, status: "draft" });
  }

  await track("signup", { role, referred: Boolean(referredById) }, userId);
  if (referredById) await track("referral_signup", { referrerId: referredById, role }, userId);
  await createSession(userId);
  redirect(role === "operator" ? "/onboarding" : safeNext(str(fd, "next"), "/dashboard?welcome=1"));
}

export async function signInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("signin", 20, 15 * 60 * 1000))) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const user = rows[0];
  // Always run a hash comparison to keep timing uniform whether or not the user exists.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok) return { error: "That email and password don't match an account." };
  if (user.disabled) return { error: "This account has been disabled. Contact support." };
  await createSession(user.id);
  await track("signin", {}, user.id);
  redirect(safeNext(str(fd, "next"), user.role === "admin" ? "/admin" : "/dashboard"));
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
