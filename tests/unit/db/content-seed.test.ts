import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count, eq, sql } from "drizzle-orm";
import {
  canonicalDishes,
  canteenDishes,
  canteenDishPriceHistory,
  canteenDishVariants,
  canteenSettings,
  canteenStallAddOnDishes,
  canteenStallAddOns,
  canteenStalls,
  contentPages,
  directoryOrganisations,
  faculties,
  faqs,
  forms,
  places,
  shuttleRoutes,
  shuttleStops,
  siteSettings,
} from "@/lib/db/schema";
import { readSiteSettings } from "@/lib/content/site";
import { seedContent } from "@/lib/db/seed/content";
import { buildDirectory } from "@/lib/db/seed/directory";
import { GUIDE_PAGES } from "@/lib/db/seed/pages";
import {
  FAQ_DOCS,
  GUIDE_PAGE_DOCS,
  PLACE_DOCS,
  WELFARE_PAGE_DOCS,
} from "@/lib/db/seed/data/handbook";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { SURVEY_DISHES } from "@/lib/canteen/survey-2569";
import { FORMS, SHUTTLE_ROUTES } from "@/data/harvested-inventory";
import { createTestDb } from "./harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let before: Record<string, number>;

const TABLES = {
  site_settings: siteSettings,
  forms,
  shuttle_routes: shuttleRoutes,
  shuttle_stops: shuttleStops,
  directory_organisations: directoryOrganisations,
  faculties,
  content_pages: contentPages,
  faqs,
  places,
  canteen_stalls: canteenStalls,
  canteen_dishes: canteenDishes,
  canonical_dishes: canonicalDishes,
  canteen_dish_variants: canteenDishVariants,
  canteen_dish_price_history: canteenDishPriceHistory,
  canteen_stall_add_ons: canteenStallAddOns,
  canteen_stall_add_on_dishes: canteenStallAddOnDishes,
  canteen_settings: canteenSettings,
} as const;

async function counts() {
  const out: Record<string, number> = {};
  for (const [name, table] of Object.entries(TABLES)) {
    const [row] = await ctx.db.select({ n: count() }).from(table);
    out[name] = row!.n;
  }
  return out;
}

beforeAll(async () => {
  ctx = await createTestDb();
  await seedContent(ctx.db);
  before = await counts();
  await seedContent(ctx.db);
}, 120_000);
afterAll(async () => {
  await ctx.client.close();
});

describe("content seed", () => {
  it("is idempotent: a second run changes no row counts", async () => {
    expect(await counts()).toEqual(before);
  });

  it("seeds the canteen completely: 18 stalls and every surveyed dish", async () => {
    const data = surveyCanteenData();
    expect(before.canteen_stalls).toBe(18);
    expect(before.canteen_stalls).toBe(data.stalls.length);
    expect(before.canteen_dishes).toBe(SURVEY_DISHES.length);
    expect(before.canonical_dishes).toBe(data.canonicals.length);
    expect(before.canteen_dish_variants).toBe(SURVEY_DISHES.reduce((n, d) => n + (d.variants?.length ?? 0), 0));
    expect(before.canteen_dish_price_history).toBe(SURVEY_DISHES.length);
    expect(before.canteen_stall_add_ons).toBe(data.stalls.reduce((n, s) => n + (s.addOns?.length ?? 0), 0));
    expect(before.canteen_stall_add_on_dishes).toBe(
      data.stalls.reduce((n, s) => n + (s.addOns ?? []).reduce((m, a) => m + (a.dishIds?.length ?? 0), 0), 0),
    );
    expect(before.canteen_settings).toBe(1);
  });

  it("links every dish to a stall and the canteen settings to a place with hours", async () => {
    const orphans = await ctx.client.query<{ n: number }>(
      "select count(*)::int as n from canteen_dishes d left join canteen_stalls s on s.id = d.stall_id where s.id is null",
    );
    expect(orphans.rows[0]!.n).toBe(0);
    const [settings] = await ctx.db.select().from(canteenSettings);
    const [place] = await ctx.db.select().from(places).where(eq(places.id, settings!.canteenPlaceId!));
    expect(place!.slug).toBe("thammasat-60-years-canteen");
    expect(place!.openingHours).toHaveLength(1);
    expect(settings!.outline.length).toBeGreaterThan(3);
  });

  it("seeds the handbook and harvested content", async () => {
    expect(before.faqs).toBe(FAQ_DOCS.length);
    const welfare = await ctx.db.select({ n: count() }).from(contentPages).where(eq(contentPages.kind, "welfare"));
    const guide = await ctx.db.select({ n: count() }).from(contentPages).where(eq(contentPages.kind, "guide"));
    expect(welfare[0]!.n).toBe(WELFARE_PAGE_DOCS.length);
    expect(guide[0]!.n).toBe(GUIDE_PAGE_DOCS.length + GUIDE_PAGES.length);
    // Handbook places plus the canteen place.
    expect(before.places).toBe(PLACE_DOCS.length + 1);
    expect(before.directory_organisations).toBe(buildDirectory().length);
    expect(before.faculties).toBe(10);
    // The emergency report Google Form is superseded by /complaints and is not seeded.
    expect(before.forms).toBe(FORMS.length - 1);
    expect(before.shuttle_routes).toBe(SHUTTLE_ROUTES.length);
    expect(before.shuttle_stops).toBe(SHUTTLE_ROUTES.reduce((n, r) => n + r.stops.length, 0));
    expect(before.site_settings).toBe(1);
  });

  it("publishes everything it seeds", async () => {
    for (const table of Object.keys(TABLES)) {
      if (["shuttle_stops", "canteen_dish_variants", "canteen_dish_price_history", "canteen_stall_add_ons", "canteen_stall_add_on_dishes"].includes(table)) continue;
      const res = await ctx.client.query<{ n: number }>(`select count(*)::int as n from ${table} where status <> 'published'`);
      expect(res.rows[0]!.n, table).toBe(0);
    }
  });

  it("applies the handbook Thai names over harvested entries that had only an English name", async () => {
    const [row] = await ctx.db.select().from(directoryOrganisations).where(eq(directoryOrganisations.slug, "liberal-arts-student-council-tha-prachan"));
    expect(row!.nameTh).toContain("คณะศิลปศาสตร์");
    expect(row!.nameEn).toBe("Liberal Arts Student Council Tha Prachan");
  });

  it("stores rich text as ProseMirror documents with no Portable Text left over and no em dashes", async () => {
    const rows = await ctx.db.select({ th: contentPages.bodyTh, en: contentPages.bodyEn }).from(contentPages);
    for (const r of rows) {
      expect(r.th.type).toBe("doc");
      expect(r.en.type).toBe("doc");
      expect(r.th.content.length).toBeGreaterThan(0);
    }
    const all = JSON.stringify(rows) + JSON.stringify(await ctx.db.select().from(faqs));
    expect(all).not.toContain(String.fromCharCode(0x2014));
    expect(all).not.toContain("_type");
  });

  it("keeps the shuttle honest: scheduled routes with ordered stops and no realtime feed", async () => {
    const routes = await ctx.db.select().from(shuttleRoutes);
    for (const r of routes) {
      expect(r.realtimeFeedUrl).toBeNull();
      expect(r.departures.length).toBeGreaterThan(10);
      expect([...r.departures].sort()).toEqual(r.departures);
    }
    const stops = await ctx.db.select().from(shuttleStops).where(eq(shuttleStops.routeId, routes[0]!.id));
    expect(stops.map((s) => s.position).sort()).toEqual(stops.map((_, i) => i));
  });

  it("has unique stall numbers and slugs, and prices that are whole baht", async () => {
    const res = await ctx.client.query<{ n: number }>("select count(distinct number)::int as n from canteen_stalls");
    expect(res.rows[0]!.n).toBe(18);
    const bad = await ctx.db.select({ n: count() }).from(canteenDishes).where(sql`${canteenDishes.price} < 0`);
    expect(bad[0]!.n).toBe(0);
  });
});

describe("site settings home tasks", () => {
  it("seeds the seven default tasks in order and maps them through the read layer", async () => {
    const settings = await readSiteSettings(ctx.db);
    expect(settings?.homeTasks.map((t) => t.path)).toEqual(["/forms", "/lost-and-found", "/complaints", "/borrow", "/welfare", "/eat", "/directory"]);
    expect(settings?.homeTasks[2]).toEqual({
      label: { th: "แจ้งปัญหา", en: "Report an issue" },
      description: { th: "เรื่องรายวิชา คณะ หรือมหาวิทยาลัย", en: "A course, your faculty or the university" },
      path: "/complaints",
    });
  });

  it("fills an empty list on re-seed but never overwrites an editor's list", async () => {
    await ctx.db.update(siteSettings).set({ homeTasks: [] });
    await seedContent(ctx.db);
    expect((await readSiteSettings(ctx.db))?.homeTasks).toHaveLength(7);

    const own = [{ label: { th: "ก", en: "A" }, description: { th: "ข", en: "B" }, path: "/news" }];
    await ctx.db.update(siteSettings).set({ homeTasks: own });
    await seedContent(ctx.db);
    expect((await readSiteSettings(ctx.db))?.homeTasks).toEqual(own);
  });
});
