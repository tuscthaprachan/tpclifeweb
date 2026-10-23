/**
 * The read layer (lib/content) against a real Postgres (PGlite) with the real
 * migrations and the real content seed. Each area checks the shape the pages
 * rely on, the ordering, and that a draft never comes back.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => holder.db, isDatabaseConfigured: () => true }));

import {
  contentPageForms,
  contentPageRelated,
  contentPages,
  events,
  faqForms,
  faqs,
  forms,
  images,
  lostFoundItemPhotos,
  lostFoundItems,
  newsPostImages,
  newsPosts,
  newsPostTags,
  places,
  policies,
  policyUpdates,
  serviceAlerts,
  siteSettings,
  canteenStalls,
} from "@/lib/db/schema";
import { seedContent } from "@/lib/db/seed/content";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { createMemoryStorage, setStorageForTests } from "@/lib/storage";
import {
  getActiveServiceAlerts,
  getActiveShuttleRoutes,
  getCanteenData,
  getContentPageBySlug,
  getContentPages,
  getEventBySlug,
  getFaqs,
  getFormBySlug,
  getForms,
  getKeyPlaces,
  getLostFoundItemByReference,
  getLostFoundItemBySlug,
  getLostFoundPage,
  getNewsPage,
  getNewsPostBySlug,
  getOrganisations,
  getPlaces,
  getPolicies,
  getPolicyBySlug,
  getPriorityForms,
  getSearchIndex,
  getSiteSettings,
  getUpcomingEvents,
  resolveRichTextRefs,
} from "@/lib/content";
import { createTestDb } from "../db/harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

const NOW = new Date("2026-08-16T05:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const published = (at: Date = NOW) => ({ status: "published" as const, publishedAt: at });

beforeAll(async () => {
  ctx = await createTestDb();
  holder.db = ctx.db;
  setStorageForTests(createMemoryStorage());
  await seedContent(ctx.db);
}, 120_000);
afterAll(async () => {
  setStorageForTests(undefined);
  await ctx.client.close();
});

const sorted = <T>(list: readonly T[], key: (item: T) => string) =>
  [...list].sort((a, b) => key(a).toLowerCase().localeCompare(key(b).toLowerCase()));

describe("site settings", () => {
  it("returns the published singleton in the page contract shape", async () => {
    const s = await getSiteSettings();
    expect(s?._type).toBe("siteSettings");
    expect(s?.serviceName.en).toBeTruthy();
    expect(s?.primaryNav.length).toBeGreaterThan(0);
    expect(s?.helpContacts.length).toBeGreaterThan(0);
    expect(typeof s?._updatedAt).toBe("string");
  });

  it("is null while the singleton is a draft", async () => {
    await ctx.db.update(siteSettings).set({ status: "draft" });
    expect(await getSiteSettings()).toBeNull();
    await ctx.db.update(siteSettings).set({ status: "published" });
    expect(await getSiteSettings()).not.toBeNull();
  });
});

describe("service alerts", () => {
  it("returns only live alerts, critical first, then newest", async () => {
    const base = { titleTh: "ก", bodyTh: "ข", bodyEn: "body" };
    await ctx.db.insert(serviceAlerts).values([
      { ...base, titleEn: "info old", severity: "info", startsAt: day(-5), ...published() },
      { ...base, titleEn: "info new", severity: "info", startsAt: day(-1), ...published() },
      { ...base, titleEn: "critical", severity: "critical", startsAt: day(-2), endsAt: day(1), ...published() },
      { ...base, titleEn: "warning", severity: "warning", startsAt: day(-3), ...published() },
      { ...base, titleEn: "expired", severity: "critical", startsAt: day(-9), endsAt: day(-8), ...published() },
      { ...base, titleEn: "future", severity: "critical", startsAt: day(2), ...published() },
      { ...base, titleEn: "draft", severity: "critical", startsAt: day(-1), status: "draft" },
    ]);
    const alerts = await getActiveServiceAlerts(NOW.toISOString());
    expect(alerts.map((a) => a.title.en)).toEqual(["critical", "warning", "info new", "info old"]);
    expect(alerts[0]).toMatchObject({ _type: "serviceAlert", severity: "critical", body: { th: "ข", en: "body" } });
    expect(alerts[0]?.endsAt).toBe(day(1).toISOString());
    expect(alerts[1]?.endsAt).toBeUndefined();
  });
});

describe("shuttle", () => {
  it("returns active published routes A to Z with stops in route order", async () => {
    const routes = await getActiveShuttleRoutes();
    expect(routes.map((r) => r.name.en)).toEqual(sorted(routes, (r) => r.name.en).map((r) => r.name.en));
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.isActive).toBe(true);
      expect(route.departures.length).toBeGreaterThan(0);
      expect(route.calendar.daysOfWeek.length).toBeGreaterThan(0);
      const offsets = route.stops.map((s) => s.offsetMinutes);
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
      expect(route.stops[0]?.offsetMinutes).toBe(0);
      expect(route.stops.every((s) => s._key)).toBe(true);
    }
  });
});

describe("forms", () => {
  it("lists active published forms, priority first", async () => {
    const list = await getForms();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((f) => f.isActive && f._type === "form")).toBe(true);
    const priorityFlags = list.map((f) => Boolean(f.isPriority));
    expect(priorityFlags).toEqual([...priorityFlags].sort((a, b) => Number(b) - Number(a)));
    const priority = await getPriorityForms();
    expect(priority.every((f) => f.isPriority)).toBe(true);
    expect(priority.map((f) => f.slug.current)).toEqual(list.filter((f) => f.isPriority).map((f) => f.slug.current));
  });

  it("finds a form by slug even when retired, but never a draft", async () => {
    const [first] = await getForms();
    await ctx.db.update(forms).set({ isActive: false }).where(eq(forms.slug, first!.slug.current));
    expect((await getForms()).map((f) => f.slug.current)).not.toContain(first!.slug.current);
    expect((await getFormBySlug(first!.slug.current))?.isActive).toBe(false);
    await ctx.db.update(forms).set({ isActive: true, status: "draft" }).where(eq(forms.slug, first!.slug.current));
    expect(await getFormBySlug(first!.slug.current)).toBeNull();
    expect((await getForms()).map((f) => f.slug.current)).not.toContain(first!.slug.current);
    await ctx.db.update(forms).set({ status: "published" }).where(eq(forms.slug, first!.slug.current));
  });
});

describe("news", () => {
  beforeAll(async () => {
    const [cover, second, third] = await ctx.db
      .insert(images)
      .values([
        { storageKey: "news/cover.jpg", altTh: "ปก", altEn: "Cover", width: 1200, height: 675 },
        { storageKey: "news/second.jpg", altTh: "สอง", altEn: "Second", captionTh: "คำบรรยาย", captionEn: "Caption" },
        { storageKey: "news/third.jpg", isDecorative: true },
      ])
      .returning();
    const body = { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };
    const base = { titleTh: "ข่าว", summaryTh: "สรุป", summaryEn: "Summary", owner: "tusu" as const, bodyEn: body };
    const [newest, middle, oldest] = await ctx.db
      .insert(newsPosts)
      .values([
        { ...base, slug: "newest", titleEn: "Newest", ...published(day(-1)), coverImageId: cover!.id, category: "welfare" },
        { ...base, slug: "middle", titleEn: "Middle", ...published(day(-3)) },
        { ...base, slug: "oldest", titleEn: "Oldest", ...published(day(-9)) },
        { ...base, slug: "draft-post", titleEn: "Draft", status: "draft", publishedAt: day(-1) },
      ])
      .returning();
    await ctx.db.insert(newsPostImages).values([
      { newsPostId: newest!.id, imageId: third!.id, position: 1 },
      { newsPostId: newest!.id, imageId: second!.id, position: 0 },
    ]);
    await ctx.db.insert(newsPostTags).values([
      { newsPostId: newest!.id, position: 1, labelTh: "สอง", labelEn: "two" },
      { newsPostId: newest!.id, position: 0, labelTh: "หนึ่ง", labelEn: "one" },
    ]);
    void middle;
    void oldest;
  });

  it("pages newest first with a published total", async () => {
    const page = await getNewsPage(1, 2);
    expect(page.total).toBe(3);
    expect(page.items.map((p) => p.slug.current)).toEqual(["newest", "middle"]);
    const next = await getNewsPage(2, 2);
    expect(next.items.map((p) => p.slug.current)).toEqual(["oldest"]);
    expect(next.total).toBe(3);
  });

  it("resolves cover, gallery order and tags", async () => {
    const post = await getNewsPostBySlug("newest");
    expect(post).toMatchObject({ _type: "newsPost", category: "welfare", owner: "tusu" });
    expect(post?.cover).toMatchObject({ url: "memory://public/news/cover.jpg", width: 1200, alt: { th: "ปก", en: "Cover" } });
    expect(post?.gallery?.map((g) => g.url)).toEqual(["memory://public/news/second.jpg", "memory://public/news/third.jpg"]);
    expect(post?.gallery?.[0]?.caption).toEqual({ th: "คำบรรยาย", en: "Caption" });
    expect(post?.gallery?.[1]?.isDecorative).toBe(true);
    expect(post?.tags?.map((t) => t.en)).toEqual(["one", "two"]);
    expect(post?.body.en.content).toHaveLength(1);
    expect(post?.body.th.content).toHaveLength(0);
  });

  it("never returns a draft", async () => {
    expect(await getNewsPostBySlug("draft-post")).toBeNull();
    expect((await getNewsPage(1, 50)).items.map((p) => p.slug.current)).not.toContain("draft-post");
  });
});

describe("events", () => {
  beforeAll(async () => {
    const [hall] = await ctx.db.insert(places).values({ slug: "event-hall", nameTh: "ห้อง", nameEn: "Event Hall", category: "activity", ...published() }).returning();
    const [form] = await ctx.db.select().from(forms).limit(1);
    const base = { titleTh: "งาน", summaryTh: "สรุป", summaryEn: "Summary", owner: "tusc" as const, ...published() };
    await ctx.db.insert(events).values([
      { ...base, slug: "ended", titleEn: "Ended", startsAt: day(-3), endsAt: day(-2) },
      { ...base, slug: "ended-no-end-time", titleEn: "Ended no end", startsAt: day(-1) },
      { ...base, slug: "ongoing", titleEn: "Ongoing", startsAt: day(-1), endsAt: day(1), placeId: hall!.id, relatedFormId: form!.id },
      { ...base, slug: "later", titleEn: "Later", startsAt: day(5), isCancelled: true, cancellationNoteEn: "Rain" },
      { ...base, slug: "soon", titleEn: "Soon", startsAt: day(2), isAllDay: true, locationEn: "Plaza" },
      { ...base, slug: "draft-event", titleEn: "Draft", startsAt: day(3), status: "draft" },
    ]);
  });

  it("returns events that have not ended, soonest first", async () => {
    const list = await getUpcomingEvents(NOW.toISOString());
    expect(list.map((e) => e.slug.current)).toEqual(["ongoing", "soon", "later"]);
  });

  it("joins place and related form, and keeps cancellation details", async () => {
    const [ongoing, later, soon] = await Promise.all([getEventBySlug("ongoing"), getEventBySlug("later"), getEventBySlug("soon")]);
    expect(ongoing?.place?.name.en).toBe("Event Hall");
    expect(ongoing?.place?._type).toBe("place");
    expect(ongoing?.relatedForm?._type).toBe("form");
    expect(later).toMatchObject({ isCancelled: true, cancellationNote: { en: "Rain" } });
    expect(soon).toMatchObject({ isAllDay: true, location: { en: "Plaza" } });
    expect((await getEventBySlug("ended"))?.slug.current).toBe("ended");
  });

  it("never returns a draft", async () => {
    expect(await getEventBySlug("draft-event")).toBeNull();
  });

  it("drops a draft place or form instead of exposing it", async () => {
    await ctx.db.update(places).set({ status: "draft" }).where(eq(places.slug, "event-hall"));
    expect((await getEventBySlug("ongoing"))?.place).toBeUndefined();
    await ctx.db.update(places).set({ status: "published" }).where(eq(places.slug, "event-hall"));
  });
});

describe("policies", () => {
  it("orders by owner as text then title, with oversight and update history", async () => {
    const base = { titleTh: "นโยบาย", summaryTh: "สรุป", summaryEn: "Summary", policyAreaTh: "ด้าน", policyAreaEn: "Area", ...published() };
    const [target, scrutiny, joint] = await ctx.db
      .insert(policies)
      .values([
        { ...base, slug: "tusu-policy", titleEn: "B policy", owner: "tusu", policyStatus: "inProgress", progressPercent: 40 },
        { ...base, slug: "tusc-policy", titleEn: "A policy", owner: "tusc" },
        { ...base, slug: "joint-policy", titleEn: "C policy", owner: "joint" },
        { ...base, slug: "draft-policy", titleEn: "D policy", owner: "tusu", status: "draft" },
      ])
      .returning();
    await ctx.db.update(policies).set({ oversightOfId: target!.id }).where(eq(policies.id, scrutiny!.id));
    await ctx.db.insert(policyUpdates).values([
      { policyId: target!.id, position: 1, date: "2026-07-02", noteEn: "second", policyStatus: "inProgress" },
      { policyId: target!.id, position: 0, date: "2026-06-01", noteEn: "first", policyStatus: "notStarted" },
    ]);
    void joint;

    const list = await getPolicies();
    expect(list.map((p) => p.slug.current)).toEqual(["joint-policy", "tusc-policy", "tusu-policy"]);
    const detail = await getPolicyBySlug("tusu-policy");
    expect(detail).toMatchObject({ status: "inProgress", progressPercent: 40 });
    expect(detail?.updates?.map((u) => u.note.en)).toEqual(["first", "second"]);
    const overseer = await getPolicyBySlug("tusc-policy");
    expect(overseer?.oversightOf).toMatchObject({ _type: "policy", _id: target!.id, status: "inProgress" });
    expect(overseer?.oversightOf?.updates).toBeUndefined();
    expect(await getPolicyBySlug("draft-policy")).toBeNull();
  });
});

describe("content pages and FAQs", () => {
  it("lists a kind with hand-ordered pages first and unordered pages last, A to Z", async () => {
    const guides = await getContentPages("guidePage");
    expect(guides.every((p) => p._type === "guidePage")).toBe(true);
    const orders = guides.map((p) => p.order);
    const firstUnordered = orders.findIndex((o) => o === undefined);
    expect(firstUnordered).toBeGreaterThan(0);
    expect(orders.slice(0, firstUnordered)).toEqual([...orders.slice(0, firstUnordered)].sort((a, b) => a! - b!));
    expect(orders.slice(firstUnordered).every((o) => o === undefined)).toBe(true);
    const tail = guides.slice(firstUnordered).map((p) => p.title.en);
    expect(tail).toEqual(sorted(tail, (t) => t));
    const welfare = await getContentPages("welfarePage");
    expect(welfare.length).toBeGreaterThan(0);
    expect(welfare.every((p) => p._type === "welfarePage")).toBe(true);
  });

  it("resolves related forms and pages in order, and skips drafts", async () => {
    const [page] = await ctx.db.insert(contentPages).values({ kind: "guide", slug: "related-test", titleEn: "Related test", category: "welfare", sortOrder: 0, ...published() }).returning();
    const [formA, formB] = await ctx.db.select().from(forms).limit(2);
    await ctx.db.insert(contentPageForms).values([
      { pageId: page!.id, formId: formB!.id, position: 1 },
      { pageId: page!.id, formId: formA!.id, position: 0 },
    ]);
    const [other] = await ctx.db.select().from(contentPages).where(eq(contentPages.slug, "our-tpc"));
    const [draftPage] = await ctx.db.insert(contentPages).values({ kind: "welfare", slug: "draft-related", titleEn: "Draft", category: "welfare", status: "draft" }).returning();
    await ctx.db.insert(contentPageRelated).values([
      { pageId: page!.id, relatedPageId: draftPage!.id, position: 0 },
      { pageId: page!.id, relatedPageId: other!.id, position: 1 },
    ]);
    const got = await getContentPageBySlug("guidePage", "related-test");
    expect(got?.relatedForms?.map((f) => f._id)).toEqual([formA!.id, formB!.id]);
    expect(got?.relatedPages?.map((p) => p.slug.current)).toEqual(["our-tpc"]);
    expect((await getContentPages("guidePage"))[0]?.slug.current).toBe("related-test");
    expect(await getContentPageBySlug("welfarePage", "related-test")).toBeNull();
    expect(await getContentPageBySlug("welfarePage", "draft-related")).toBeNull();
  });

  it("returns FAQs in handbook order with their forms, never a draft", async () => {
    const list = await getFaqs();
    expect(list.length).toBeGreaterThan(0);
    const orders = list.map((f) => f.order ?? Infinity);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    const [form] = await ctx.db.select().from(forms).limit(1);
    await ctx.db.insert(faqForms).values({ faqId: list[0]!._id, formId: form!.id, position: 0 });
    await ctx.db.insert(faqs).values({ questionEn: "Draft question", category: "welfare", status: "draft" });
    const again = await getFaqs();
    expect(again).toHaveLength(list.length);
    expect(again[0]?.relatedForms?.[0]?._id).toBe(form!.id);
    expect(again[0]).toMatchObject({ _type: "faq" });
  });
});

describe("directory", () => {
  it("lists active organisations and places A to Z", async () => {
    const orgs = await getOrganisations();
    expect(orgs.length).toBeGreaterThan(0);
    expect(orgs.map((o) => o.name.en)).toEqual(sorted(orgs, (o) => o.name.en).map((o) => o.name.en));
    expect(orgs.every((o) => o.isActive && o.contacts.every((c) => c._key))).toBe(true);
    const all = await getPlaces();
    const key = await getKeyPlaces();
    expect(key.length).toBeGreaterThan(0);
    expect(key.every((p) => p.isKeyLocation)).toBe(true);
    expect(all.map((p) => p.name.en)).toEqual(sorted(all, (p) => p.name.en).map((p) => p.name.en));
  });
});

describe("lost and found", () => {
  const SECRET_CONTACT = "SECRET-CONTACT-0812345678";
  const SECRET_DETAIL = "SECRET-DETAIL-scratch-on-lid";

  beforeAll(async () => {
    const [photoA, photoB] = await ctx.db
      .insert(images)
      .values([
        { storageKey: "lf/a.jpg", altTh: "ก", altEn: "A" },
        { storageKey: "lf/b.jpg", altTh: "ข", altEn: "B" },
      ])
      .returning();
    const [hall] = await ctx.db.select().from(places).limit(1);
    const base = {
      titleTh: "ของ",
      descriptionTh: "รายละเอียด",
      descriptionEn: "Details",
      category: "keys" as const,
      owner: "tusc" as const,
      submitterContact: SECRET_CONTACT,
      staffVerificationDetail: SECRET_DETAIL,
    };
    const rows = await ctx.db
      .insert(lostFoundItems)
      .values([
        { ...base, reference: "LF-2026-0001", slug: "lf-2026-0001", kind: "lost", titleEn: "Old lost", occurredOn: "2026-08-01", ...published(day(-10)) },
        { ...base, reference: "LF-2026-0002", slug: "lf-2026-0002", kind: "found", titleEn: "Found keys", occurredOn: "2026-08-10", placeId: hall!.id, heldAtEn: "TUSU desk", claimBy: "2026-09-10", ...published(day(-5)) },
        { ...base, reference: "LF-2026-0003", slug: "lf-2026-0003", kind: "found", titleEn: "Returned wallet", category: "wallet", occurredOn: "2026-08-10", registerStatus: "returned", ...published(day(-2)) },
        { ...base, reference: "LF-2026-0004", slug: "lf-2026-0004", kind: "lost", titleEn: "Waiting for approval", occurredOn: "2026-08-14", status: "draft", submittedByStudent: true },
        { ...base, reference: "LF-2026-0005", slug: "lf-2026-0005", kind: "lost", titleEn: "Newest lost", occurredOn: "2026-08-12", ...published(day(-1)) },
      ])
      .returning();
    await ctx.db.insert(lostFoundItemPhotos).values([
      { itemId: rows[1]!.id, imageId: photoB!.id, position: 1 },
      { itemId: rows[1]!.id, imageId: photoA!.id, position: 0 },
    ]);
  });

  it("lists published entries newest occurrence first, then newest published", async () => {
    const { items, total } = await getLostFoundPage();
    expect(total).toBe(4);
    expect(items.map((i) => i.reference)).toEqual(["LF-2026-0005", "LF-2026-0003", "LF-2026-0002", "LF-2026-0001"]);
  });

  it("filters by kind, category and status, and counts the filtered set", async () => {
    expect((await getLostFoundPage({ kind: "found" })).items.map((i) => i.reference)).toEqual(["LF-2026-0003", "LF-2026-0002"]);
    expect((await getLostFoundPage({ category: "wallet" })).total).toBe(1);
    const open = await getLostFoundPage({ status: "open" });
    expect(open.items.map((i) => i.reference)).toEqual(["LF-2026-0005", "LF-2026-0002", "LF-2026-0001"]);
    const paged = await getLostFoundPage({ status: "open" }, 2, 2);
    expect(paged.items.map((i) => i.reference)).toEqual(["LF-2026-0001"]);
    expect(paged.total).toBe(3);
  });

  it("returns the contract shape with place and photos in order", async () => {
    const item = await getLostFoundItemBySlug("lf-2026-0002");
    expect(item).toMatchObject({
      _type: "lostFoundItem",
      reference: "LF-2026-0002",
      kind: "found",
      status: "open",
      occurredOn: "2026-08-10",
      heldAt: { en: "TUSU desk" },
      claimBy: "2026-09-10",
    });
    expect(item?.place?._type).toBe("place");
    expect(item?.photos?.map((p) => p.url)).toEqual(["memory://public/lf/a.jpg", "memory://public/lf/b.jpg"]);
  });

  it("looks up by reference without regard to case", async () => {
    expect((await getLostFoundItemByReference("lf-2026-0002"))?.slug.current).toBe("lf-2026-0002");
    expect((await getLostFoundItemByReference("LF-2026-0002"))?.slug.current).toBe("lf-2026-0002");
    expect(await getLostFoundItemByReference("LF-2026-9999")).toBeNull();
  });

  it("never returns a draft, by list, slug or reference", async () => {
    expect(await getLostFoundItemBySlug("lf-2026-0004")).toBeNull();
    expect(await getLostFoundItemByReference("LF-2026-0004")).toBeNull();
    expect((await getLostFoundPage({}, 1, 100)).items.map((i) => i.reference)).not.toContain("LF-2026-0004");
  });

  it("never leaks a private field anywhere in what it returns", async () => {
    const everything = JSON.stringify([
      await getLostFoundPage({}, 1, 100),
      await getLostFoundItemBySlug("lf-2026-0002"),
      await getLostFoundItemByReference("LF-2026-0001"),
      await getSearchIndex(),
    ]);
    expect(everything).not.toContain(SECRET_CONTACT);
    expect(everything).not.toContain(SECRET_DETAIL);
    expect(everything).not.toMatch(/submitterContact|staffVerificationDetail/);
  });

  it("is backed by a view with no private columns", async () => {
    const res = await ctx.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'lost_found_public'",
    );
    const names = res.rows.map((r) => r.column_name);
    expect(names).toContain("reference");
    expect(names).not.toContain("submitter_contact");
    expect(names).not.toContain("staff_verification_detail");
  });
});

describe("search index", () => {
  it("builds records for every searchable type, each with both languages", async () => {
    const index = await getSearchIndex();
    expect(Number.isNaN(Date.parse(index.generatedAt))).toBe(false);
    const types = new Set(index.records.map((r) => r.type));
    for (const type of ["form", "shuttleRoute", "welfarePage", "guidePage", "faq", "event", "newsPost", "policy", "organisation", "place", "lostFoundItem", "canteenDish", "canonicalDish"]) {
      expect(types, type).toContain(type);
    }
    for (const r of index.records) {
      expect(r.id).toBeTruthy();
      expect(r.path.th.startsWith("/th/")).toBe(true);
      expect(r.path.en.startsWith("/en/")).toBe(true);
      expect(typeof r.title.th).toBe("string");
      expect(typeof r.summary.en).toBe("string");
      expect(typeof r.haystack).toBe("string");
      expect(r.weight).toBeGreaterThan(0);
    }
  });

  it("uses the routes that exist and the anchors the pages render", async () => {
    const { records } = await getSearchIndex();
    const first = (type: string) => records.find((r) => r.type === type)!;
    expect(first("form").path.en).toMatch(/^\/en\/forms\/[^/]+$/);
    expect(first("shuttleRoute").path.en).toMatch(/^\/en\/getting-around#route-/);
    expect(first("organisation").path.en).toMatch(/^\/en\/directory#org-/);
    expect(first("place").path.en).toMatch(/^\/en\/directory#place-/);
    expect(first("faq").path.en).toMatch(/^\/en\/faq#[0-9a-f-]{36}$/);
    expect(first("policy").path.en).toMatch(/^\/en\/policy\//);
    expect(first("shuttleRoute").category).toBe("transport");
  });

  it("indexes only what readers can see: no drafts, no cancelled events, only open lost property", async () => {
    const { records } = await getSearchIndex();
    const paths = records.map((r) => r.path.en);
    expect(paths).not.toContain("/en/news/draft-post");
    expect(paths).not.toContain("/en/events/draft-event");
    expect(paths).not.toContain("/en/policy/draft-policy");
    expect(paths).not.toContain("/en/lost-and-found/lf-2026-0004");
    expect(paths).not.toContain("/en/lost-and-found/lf-2026-0003");
    expect(paths).toContain("/en/lost-and-found/lf-2026-0002");
    const found = records.find((r) => r.type === "lostFoundItem" && r.path.en.endsWith("lf-2026-0002"))!;
    expect(found.haystack).toContain("LF-2026-0002");
    expect(found.haystack).toContain("Found keys");
    await ctx.db.update(events).set({ isCancelled: true }).where(eq(events.slug, "soon"));
    expect((await getSearchIndex()).records.map((r) => r.path.en)).not.toContain("/en/events/soon");
    await ctx.db.update(events).set({ isCancelled: false }).where(eq(events.slug, "soon"));
  });

  it("puts the text of rich bodies in the haystack", async () => {
    const { records } = await getSearchIndex();
    const news = records.find((r) => r.path.en === "/en/news/newest");
    expect(news).toBeDefined();
    const [page] = await ctx.db.select().from(contentPages).where(eq(contentPages.slug, "our-tpc"));
    const record = records.find((r) => r.id === page!.id)!;
    expect(record.haystack.length).toBeGreaterThan(page!.titleEn.length + page!.summaryEn.length);
  });
});

describe("canteen", () => {
  it("returns the whole seeded canteen with plain id references", async () => {
    const data = await getCanteenData();
    const survey = surveyCanteenData();
    expect(data.stalls).toHaveLength(survey.stalls.length);
    expect(data.dishes).toHaveLength(survey.dishes.length);
    expect(data.canonicals).toHaveLength(survey.canonicals.length);
    const stallIds = new Set(data.stalls.map((s) => s._id));
    const canonicalIds = new Set(data.canonicals.map((c) => c._id));
    const dishIds = new Set(data.dishes.map((d) => d._id));
    for (const dish of data.dishes) {
      expect(stallIds.has(dish.stallId)).toBe(true);
      if (dish.canonicalId) expect(canonicalIds.has(dish.canonicalId)).toBe(true);
      expect(dish.price).toBeGreaterThanOrEqual(0);
      expect(dish.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const stall of data.stalls) {
      for (const addOn of stall.addOns ?? []) for (const id of addOn.dishIds ?? []) expect(dishIds.has(id)).toBe(true);
    }
    expect(data.stalls.map((s) => s.number)).toEqual([...data.stalls.map((s) => s.number)].sort((a, b) => a - b));
    expect(data.settings?.canteen?.openingHours?.length).toBeGreaterThan(0);
    expect(data.settings?.outline?.length).toBeGreaterThan(3);
    expect(data.settings?.gridCols).toBeGreaterThan(0);
  });

  it("keeps variants in order and a stall's own map cell", async () => {
    const data = await getCanteenData();
    const surveyed = surveyCanteenData();
    const withVariants = surveyed.dishes.find((d) => (d.variants ?? []).length > 1)!;
    const got = data.dishes.find((d) => d.slug.current === withVariants.slug.current)!;
    expect(got.variants?.map((v) => v.label.en)).toEqual(withVariants.variants!.map((v) => v.label.en));
    const stall = surveyed.stalls[0]!;
    const gotStall = data.stalls.find((s) => s.slug.current === stall.slug.current)!;
    expect(gotStall.mapCell).toMatchObject({ col: stall.mapCell.col, row: stall.mapCell.row, w: stall.mapCell.w, h: stall.mapCell.h });
  });

  it("drops an unpublished stall's dishes", async () => {
    const before = await getCanteenData();
    const [stall] = before.stalls;
    await ctx.db.update(canteenStalls).set({ status: "draft" }).where(eq(canteenStalls.id, stall!._id));
    const after = await getCanteenData();
    expect(after.stalls.find((s) => s._id === stall!._id)).toBeUndefined();
    expect(after.dishes.some((d) => d.stallId === stall!._id)).toBe(false);
    expect(after.dishes.length).toBeLessThan(before.dishes.length);
    await ctx.db.update(canteenStalls).set({ status: "published" }).where(eq(canteenStalls.id, stall!._id));
  });

  it("falls back to the surveyed dataset only when the database cannot be read, not when it is empty", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const real = holder.db;
    try {
      await ctx.db.update(canteenStalls).set({ status: "draft" });
      const empty = await getCanteenData();
      expect(empty.stalls).toHaveLength(0);
      expect(error).not.toHaveBeenCalled();

      holder.db = undefined; // the database is unreachable
      const down = await getCanteenData();
      expect(down.stalls).toHaveLength(surveyCanteenData().stalls.length);
      expect(error.mock.calls[0]?.[0]).toMatch(/^\[content\] getCanteenData failed/);
    } finally {
      holder.db = real;
      await ctx.db.update(canteenStalls).set({ status: "published" });
      error.mockRestore();
    }
  });
});

describe("degradation", () => {
  it("returns empty results with a [content] log when the database is down", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const real = holder.db;
    try {
      holder.db = undefined;
      expect(await getForms()).toEqual([]);
      expect(await getNewsPage()).toEqual({ items: [], total: 0 });
      expect(await getLostFoundPage()).toEqual({ items: [], total: 0 });
      expect(await getSiteSettings()).toBeNull();
      expect(await getNewsPostBySlug("x")).toBeNull();
      expect((await getSearchIndex()).records).toEqual([]);
      expect(error).toHaveBeenCalled();
      expect(error.mock.calls.every((call) => String(call[0]).startsWith("[content] "))).toBe(true);
    } finally {
      holder.db = real;
      error.mockRestore();
    }
  });
});

describe("rich text references", () => {
  it("resolves forms and images for several documents in one batch, leaving out what is not published", async () => {
    const [published] = await ctx.db.select().from(forms).where(eq(forms.status, "published")).limit(1);
    const [draft] = await ctx.db
      .insert(forms)
      .values({ slug: "draft-form", titleEn: "Draft form", category: "welfare", owner: "tusu", destinationType: "email", status: "draft" })
      .returning();
    const [image] = await ctx.db.select().from(images).where(eq(images.storageKey, "news/cover.jpg"));
    const doc = (content: unknown[]) => ({ type: "doc" as const, content: content as never });
    const resolved = await resolveRichTextRefs([
      doc([{ type: "formCallout", attrs: { formId: published!.id } }]),
      doc([{ type: "formCallout", attrs: { formId: draft!.id } }, { type: "image", attrs: { imageId: image!.id, isDecorative: true } }]),
      null,
      undefined,
    ]);
    expect([...(resolved.forms?.keys() ?? [])]).toEqual([published!.id]);
    expect(resolved.forms?.get(published!.id)).toMatchObject({ id: published!.id, slug: published!.slug, isActive: true });
    expect(resolved.images?.get(image!.id)).toEqual({ url: "memory://public/news/cover.jpg" });
  });

  it("does no work for documents with no references", async () => {
    const resolved = await resolveRichTextRefs([{ type: "doc", content: [] }]);
    expect(resolved.forms?.size ?? 0).toBe(0);
    expect(resolved.images?.size ?? 0).toBe(0);
  });
});
