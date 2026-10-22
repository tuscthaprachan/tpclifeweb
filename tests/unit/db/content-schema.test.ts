import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, getTableColumns, getViewSelectedFields, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import {
  canteenDishes,
  canteenSettings,
  canteenStalls,
  contentPageRelated,
  contentPages,
  events,
  lostFoundItems,
  lostFoundPublic,
  policies,
  referenceCounters,
  serviceAlerts,
  siteSettings,
} from "@/lib/db/schema";
import { formatReference, nextLostFoundReference, nextReference } from "@/lib/db/references";
import { recordRevision } from "@/lib/db/revisions";
import { withAudit } from "@/lib/db/audit";
import * as options from "@/lib/canteen/options";
import { createTestDb } from "./harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  ctx = await createTestDb();
}, 60_000);
afterAll(async () => {
  await ctx.client.close();
});

const NOW = new Date("2026-10-22T00:00:00Z");

async function newItem(overrides: Partial<typeof lostFoundItems.$inferInsert> = {}) {
  const reference = await withAudit(ctx.db, {}, (tx) => nextLostFoundReference(tx, 2030));
  const [row] = await ctx.db
    .insert(lostFoundItems)
    .values({
      reference,
      slug: reference.toLowerCase(),
      kind: "lost",
      category: "umbrella",
      occurredOn: "2026-10-01",
      owner: "tusc",
      ...overrides,
    })
    .returning();
  return row!;
}

describe("content migration", () => {
  it("creates every content table", async () => {
    const res = await ctx.client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = res.rows.map((r) => r.table_name);
    for (const t of [
      "images", "site_settings", "service_alerts", "shuttle_routes", "shuttle_stops", "forms", "news_posts",
      "news_post_images", "news_post_tags", "events", "policies", "policy_updates", "content_pages",
      "content_page_forms", "content_page_related", "faqs", "faq_forms", "directory_organisations", "places",
      "lost_found_items", "lost_found_item_photos", "reference_counters", "canteen_stalls", "canonical_dishes",
      "canteen_dishes", "canteen_dish_variants", "canteen_dish_price_history", "canteen_stall_add_ons",
      "canteen_stall_add_on_dishes", "canteen_settings", "content_revisions",
    ]) {
      expect(names, t).toContain(t);
    }
  });

  it("gives every content table the shared columns", () => {
    const tables = [
      schema.siteSettings, schema.serviceAlerts, schema.shuttleRoutes, schema.forms, schema.newsPosts,
      schema.events, schema.policies, schema.contentPages, schema.faqs, schema.directoryOrganisations,
      schema.places, schema.lostFoundItems, schema.canteenStalls, schema.canonicalDishes,
      schema.canteenDishes, schema.canteenSettings,
    ];
    for (const table of tables) {
      const cols = Object.keys(getTableColumns(table));
      for (const c of ["id", "status", "publishedAt", "createdAt", "updatedAt", "createdBy", "updatedBy"]) {
        expect(cols, `${getTableConfig(table).name}.${c}`).toContain(c);
      }
    }
  });

  it("keeps the canteen enums in step with lib/canteen/options.ts and the Postgres labels", async () => {
    const pairs: Array<[{ enumName: string; enumValues: readonly string[] }, readonly string[]]> = [
      [schema.canteenCuisineEnum, options.CUISINES],
      [schema.dishTypeEnum, options.DISH_TYPES],
      [schema.dishCourseEnum, options.DISH_COURSES],
      [schema.proteinEnum, options.PROTEINS],
      [schema.allergenEnum, options.ALLERGENS],
      [schema.cookingStyleEnum, options.COOKING_STYLES],
      [schema.mapShapeEnum, options.MAP_SHAPES],
    ];
    for (const [pgEnum, expected] of pairs) {
      expect([...pgEnum.enumValues].sort(), pgEnum.enumName).toEqual([...expected].sort());
      const res = await ctx.client.query<{ enumlabel: string }>(
        "select e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = $1 order by e.enumsortorder",
        [pgEnum.enumName],
      );
      expect(res.rows.map((r) => r.enumlabel)).toEqual([...pgEnum.enumValues]);
    }
  });

  it("orders alert severities so that descending puts critical first", async () => {
    for (const severity of ["info", "critical", "warning"] as const) {
      await ctx.db.insert(serviceAlerts).values({
        status: "published", titleEn: severity, severity, startsAt: new Date("2026-10-01T00:00:00Z"),
      });
    }
    const rows = await ctx.db.select().from(serviceAlerts).orderBy(sql`${serviceAlerts.severity} desc`);
    expect(rows.map((r) => r.severity)).toEqual(["critical", "warning", "info"]);
  });

  it("answers the active-alert window and the upcoming-events predicate like the GROQ did", async () => {
    await ctx.db.delete(serviceAlerts);
    const t = (s: string) => new Date(s);
    await ctx.db.insert(serviceAlerts).values([
      { status: "published", titleEn: "live, open ended", startsAt: t("2026-10-01T00:00:00Z") },
      { status: "published", titleEn: "live, ends later", startsAt: t("2026-10-01T00:00:00Z"), endsAt: t("2026-11-01T00:00:00Z") },
      { status: "published", titleEn: "expired", startsAt: t("2026-09-01T00:00:00Z"), endsAt: t("2026-10-01T00:00:00Z") },
      { status: "published", titleEn: "future", startsAt: t("2026-12-01T00:00:00Z") },
      { status: "draft", titleEn: "draft", startsAt: t("2026-10-01T00:00:00Z") },
    ]);
    const active = await ctx.db
      .select({ title: serviceAlerts.titleEn })
      .from(serviceAlerts)
      .where(sql`${serviceAlerts.status} = 'published' and ${serviceAlerts.startsAt} <= ${NOW} and (${serviceAlerts.endsAt} is null or ${serviceAlerts.endsAt} >= ${NOW})`);
    expect(active.map((a) => a.title).sort()).toEqual(["live, ends later", "live, open ended"]);

    await ctx.db.insert(events).values([
      { status: "published", slug: "e-past", titleEn: "past", startsAt: t("2026-10-01T00:00:00Z"), owner: "tusu" },
      { status: "published", slug: "e-past-ranged", titleEn: "ranged, still on", startsAt: t("2026-10-01T00:00:00Z"), endsAt: t("2026-10-30T00:00:00Z"), owner: "tusu" },
      { status: "published", slug: "e-future", titleEn: "future", startsAt: t("2026-11-01T00:00:00Z"), owner: "tusu" },
    ]);
    const upcoming = await ctx.db
      .select({ slug: events.slug })
      .from(events)
      .where(sql`${events.status} = 'published' and coalesce(${events.endsAt}, ${events.startsAt}) >= ${NOW}`)
      .orderBy(events.startsAt);
    expect(upcoming.map((e) => e.slug)).toEqual(["e-past-ranged", "e-future"]);
  });
});

describe("singletons and integrity", () => {
  it("allows only one site_settings and one canteen_settings row", async () => {
    await ctx.db.insert(siteSettings).values({ singletonKey: "site" });
    await expect(ctx.db.insert(siteSettings).values({ singletonKey: "site" })).rejects.toThrow();
    await expect(ctx.db.insert(siteSettings).values({ singletonKey: "other" })).rejects.toThrow();
    await ctx.db.insert(canteenSettings).values({ gridCols: 4, gridRows: 4 });
    await expect(ctx.db.insert(canteenSettings).values({ gridCols: 4, gridRows: 4 })).rejects.toThrow();
  });

  it("enforces foreign keys, cascades and check constraints", async () => {
    const ghost = "00000000-0000-0000-0000-000000000000";
    await expect(
      ctx.db.insert(canteenDishes).values({
        slug: "ghost-dish", stallId: ghost, price: 40, type: "rice", course: "main", checkedOn: "2026-10-21",
      }),
    ).rejects.toThrow();

    const [stall] = await ctx.db
      .insert(canteenStalls)
      .values({ slug: "s-test", number: 99, mapCol: 0, mapRow: 0 })
      .returning();
    await ctx.db.insert(canteenDishes).values({
      slug: "d-test", stallId: stall!.id, price: 40, type: "rice", course: "main", checkedOn: "2026-10-21",
    });
    await expect(
      ctx.db.insert(canteenDishes).values({
        slug: "d-negative", stallId: stall!.id, price: -1, type: "rice", course: "main", checkedOn: "2026-10-21",
      }),
    ).rejects.toThrow();
    await ctx.db.delete(canteenStalls).where(eq(canteenStalls.id, stall!.id));
    const left = await ctx.db.select().from(canteenDishes).where(eq(canteenDishes.slug, "d-test"));
    expect(left).toHaveLength(0);

    const [a] = await ctx.db.insert(contentPages).values({ kind: "guide", slug: "a", category: "welfare" }).returning();
    await expect(ctx.db.insert(contentPageRelated).values({ pageId: a!.id, relatedPageId: a!.id, position: 0 })).rejects.toThrow();
    await expect(ctx.db.insert(contentPages).values({ kind: "guide", slug: "a", category: "welfare" })).rejects.toThrow();
    await ctx.db.insert(contentPages).values({ kind: "welfare", slug: "a", category: "welfare" });

    await expect(
      ctx.db.insert(policies).values({ slug: "p-bad", owner: "tusu", progressPercent: 140 }),
    ).rejects.toThrow();
  });

  it("numbers revisions per entity", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const other = "22222222-2222-2222-2222-222222222222";
    const numbers = await withAudit(ctx.db, {}, async (tx) => [
      await recordRevision(tx, { entityType: "forms", entityId: id, revision: { v: 1 } }),
      await recordRevision(tx, { entityType: "forms", entityId: id, revision: { v: 2 }, createdBy: "u1" }),
      await recordRevision(tx, { entityType: "forms", entityId: other, revision: { v: 1 } }),
    ]);
    expect(numbers).toEqual([1, 2, 1]);
  });
});

describe("lost and found", () => {
  it("keeps the private columns on the table and off the public view", async () => {
    const tableCols = Object.keys(getTableColumns(lostFoundItems));
    expect(tableCols).toContain("submitterContact");
    expect(tableCols).toContain("staffVerificationDetail");
    const viewCols = Object.keys(getViewSelectedFields(lostFoundPublic));
    expect(viewCols).not.toContain("submitterContact");
    expect(viewCols).not.toContain("staffVerificationDetail");
    const res = await ctx.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'lost_found_public'",
    );
    const names = res.rows.map((r) => r.column_name);
    expect(names).not.toContain("submitter_contact");
    expect(names).not.toContain("staff_verification_detail");
    expect(names).toContain("reference");
  });

  it("shows only published rows through the public view; a report is a draft awaiting approval", async () => {
    const draft = await newItem({
      submittedByStudent: true,
      submitterContact: "081-000-0000",
      staffVerificationDetail: "scratch on the left side",
      titleEn: "Pending report",
    });
    expect(draft.status).toBe("draft");
    expect(await ctx.db.select().from(lostFoundPublic).where(eq(lostFoundPublic.id, draft.id))).toHaveLength(0);

    await ctx.db.update(lostFoundItems).set({ status: "published", publishedAt: NOW }).where(eq(lostFoundItems.id, draft.id));
    const [visible] = await ctx.db.select().from(lostFoundPublic).where(eq(lostFoundPublic.id, draft.id));
    expect(visible!.reference).toBe(draft.reference);
    expect(Object.keys(visible!)).not.toContain("submitterContact");
  });

  it("looks references up case-insensitively and rejects malformed or duplicate ones", async () => {
    const item = await newItem();
    const found = await ctx.db
      .select({ id: lostFoundItems.id })
      .from(lostFoundItems)
      .where(sql`lower(${lostFoundItems.reference}) = lower(${item.reference.toLowerCase()})`);
    expect(found).toHaveLength(1);
    await expect(newItem({ reference: item.reference, slug: "other-slug" })).rejects.toThrow();
    await expect(newItem({ reference: "LF-26-1", slug: "bad" })).rejects.toThrow();
  });
});

describe("case reference allocation", () => {
  it("formats LF-YYYY-NNNN", () => {
    expect(formatReference("LF", 2026, 1)).toBe("LF-2026-0001");
    expect(formatReference("CP", 2026, 12345)).toBe("CP-2026-12345");
  });

  it("is sequential and independent per year and per prefix", async () => {
    const refs = await withAudit(ctx.db, {}, async (tx) => [
      await nextLostFoundReference(tx, 2041),
      await nextLostFoundReference(tx, 2041),
      await nextLostFoundReference(tx, 2042),
      await nextReference(tx, "CP", 2041),
      await nextLostFoundReference(tx, 2041),
    ]);
    expect(refs).toEqual(["LF-2041-0001", "LF-2041-0002", "LF-2042-0001", "CP-2041-0001", "LF-2041-0003"]);
  });

  it("never hands the same number to concurrent callers", async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, () => withAudit(ctx.db, {}, (tx) => nextLostFoundReference(tx, 2050))),
    );
    expect(new Set(results).size).toBe(25);
    expect([...results].sort()).toEqual(Array.from({ length: 25 }, (_, i) => formatReference("LF", 2050, i + 1)));
  });

  it("gives a number back when the surrounding transaction rolls back", async () => {
    await expect(
      withAudit(ctx.db, {}, async (tx) => {
        await nextLostFoundReference(tx, 2060);
        throw new Error("submission failed");
      }),
    ).rejects.toThrow("submission failed");
    expect(await withAudit(ctx.db, {}, (tx) => nextLostFoundReference(tx, 2060))).toBe("LF-2060-0001");
    const [row] = await ctx.db.select().from(referenceCounters).where(sql`${referenceCounters.year} = 2060`);
    expect(row!.lastValue).toBe(1);
  });
});
