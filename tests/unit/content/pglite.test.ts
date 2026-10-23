import { afterAll, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { openPglite } from "@/lib/db/pglite";
import { canteenDishes, organisations, siteSettings } from "@/lib/db/schema";

/** `DATABASE_URL=pglite:memory`: migrations applied and the content seed run on first open. */
describe("openPglite", () => {
  let db: Awaited<ReturnType<typeof openPglite>> | undefined;
  afterAll(async () => {
    await db?.$client.close();
  });

  it("gives a migrated, seeded database", async () => {
    db = await openPglite({ dataDir: undefined });
    const [{ n: orgs } = { n: 0 }] = await db.select({ n: count() }).from(organisations);
    const [{ n: settings } = { n: 0 }] = await db.select({ n: count() }).from(siteSettings);
    const [{ n: dishes } = { n: 0 }] = await db.select({ n: count() }).from(canteenDishes);
    expect(orgs).toBe(2);
    expect(settings).toBe(1);
    expect(dishes).toBeGreaterThan(100);
  }, 120_000);
});
