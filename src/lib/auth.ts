import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "./db";
import type { Role } from "./db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;

const SESSION_COOKIE = "op_session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { ...SCRYPT, N: Number(n) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; email: string; name: string; role: Role; referralCode: string };

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role, referralCode: schema.users.referralCode, disabled: schema.users.disabled })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  if (!u || u.disabled) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, referralCode: u.referralCode };
});

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) {
    const h = await headers();
    const next = h.get("x-pathname") ?? "/dashboard";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (roles && !roles.includes(user.role)) redirect("/dashboard?denied=1");
  return user;
}

/** For server actions: throws instead of redirecting so callers can surface a message. */
export async function assertUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new AuthError("Please sign in to continue.");
  if (roles && !roles.includes(user.role)) throw new AuthError("You don't have permission to do that.");
  return user;
}

export class AuthError extends Error {}

export const getCompanyForUser = cache(async (userId: string) => {
  const rows = await db.select().from(schema.companies).where(eq(schema.companies.ownerId, userId)).limit(1);
  return rows[0] ?? null;
});

export const getOperatorForUser = cache(async (userId: string) => {
  const rows = await db.select().from(schema.operators).where(eq(schema.operators.userId, userId)).limit(1);
  return rows[0] ?? null;
});

/* Simple fixed-window limiter. Per-instance only; use a shared store (e.g. Redis) when scaling out. */
const buckets = new Map<string, { count: number; reset: number }>();
export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (process.env.NODE_ENV !== "production" && process.env.DISABLE_RATE_LIMIT === "true") return true;
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
