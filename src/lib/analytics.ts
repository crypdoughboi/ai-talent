import "server-only";
import { db, schema } from "./db";
import { newId } from "./utils";

/** First-party analytics: stored in our own database, no third-party trackers. */
export async function track(name: string, props: Record<string, unknown> = {}, userId?: string | null, path?: string | null) {
  try {
    await db.insert(schema.events).values({ id: newId("ev"), name, props, userId: userId ?? null, path: path ?? null });
  } catch (e) {
    console.error("[analytics] failed to record event", name, e);
  }
}
