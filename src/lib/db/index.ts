import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __opsClient?: Client; __opsDb?: LibSQLDatabase<typeof schema> };

function makeClient() {
  return createClient({
    url: process.env.DATABASE_URL ?? "file:data/operators.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

export const client = globalForDb.__opsClient ?? makeClient();
export const db = globalForDb.__opsDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__opsClient = client;
  globalForDb.__opsDb = db;
}

export { schema };
