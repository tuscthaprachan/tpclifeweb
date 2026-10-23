import "server-only";

import { and, eq } from "drizzle-orm";
import { normaliseCanteenData } from "@/lib/canteen/derive";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import {
  contentPages,
  directoryOrganisations,
  events,
  faqs,
  forms,
  lostFoundPublic,
  newsPosts,
  places,
  policies,
  shuttleRoutes,
} from "@/lib/db/schema";
import { richTextToPlainText } from "@/lib/rich-text/text";
import { canteenSearchRecords } from "@/lib/search/canteen";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { readCanteenData } from "./canteen";
import { readPlacesByIds } from "./directory";
import { ls } from "./map";
import { safeFetch } from "./safe-fetch";
import type { Category, Owner, SearchIndex, SearchRecord, SearchableType } from "./types";

/**
 * Search index
 *
 * One row per indexable record, both languages in the same record so a Thai
 * query finds an English-only match and back. `path` follows the site's
 * locale-prefixed route convention (see `lib/i18n/config.ts`'s `localePath`).
 *
 * Every path below has been checked against the routes that actually exist
 * under `app/[locale]`. Types without a page of their own deep-link to the
 * page that lists them, using an anchor: shuttle routes to
 * `/getting-around#route-{slug}`, organisations and places to
 * `/directory#org-{slug}` and `#place-{slug}`, and FAQs to `/faq#{id}`. Those
 * anchor ids must exist on the rendered items or the link lands at the top of
 * the page, which is degraded but not broken. If you add a type here, add its
 * route first.
 *
 * Only published rows are indexed, and only what a public page already shows.
 * Lost and found reads the public view, never the table.
 */

const join = (...parts: Array<string | null | undefined>): string => parts.filter(Boolean).join(" ");

const route = (prefix: string, key: string) => ({ th: `/th/${prefix}${key}`, en: `/en/${prefix}${key}` });

interface Extras {
  category?: Category | null;
  owner?: Owner | null;
}

function record(
  id: string,
  type: SearchableType,
  path: SearchRecord["path"],
  title: SearchRecord["title"],
  summary: SearchRecord["summary"],
  haystack: string,
  weight: number,
  { category, owner }: Extras = {},
): SearchRecord {
  return { id, type, path, title, summary, haystack, weight, ...(category ? { category } : {}), ...(owner ? { owner } : {}) };
}

/** Throws if any query fails, so a partial index is never cached. */
export async function readSearchIndex(db: AuditExecutor): Promise<SearchIndex> {
  const [
    formRows,
    routeRows,
    pageRows,
    faqRows,
    eventRows,
    newsRows,
    policyRows,
    orgRows,
    placeRows,
    lostFoundRows,
  ] = await Promise.all([
    db.select().from(forms).where(and(eq(forms.status, "published"), eq(forms.isActive, true))),
    db.select().from(shuttleRoutes).where(and(eq(shuttleRoutes.status, "published"), eq(shuttleRoutes.isActive, true))),
    db.select().from(contentPages).where(eq(contentPages.status, "published")),
    db.select().from(faqs).where(eq(faqs.status, "published")),
    db.select().from(events).where(and(eq(events.status, "published"), eq(events.isCancelled, false))),
    db.select().from(newsPosts).where(eq(newsPosts.status, "published")),
    db.select().from(policies).where(eq(policies.status, "published")),
    db
      .select()
      .from(directoryOrganisations)
      .where(and(eq(directoryOrganisations.status, "published"), eq(directoryOrganisations.isActive, true))),
    db.select().from(places).where(eq(places.status, "published")),
    db.select().from(lostFoundPublic).where(eq(lostFoundPublic.registerStatus, "open")),
  ]);
  const lostFoundPlaces = await readPlacesByIds(db, lostFoundRows.map((item) => item.placeId));

  const records: SearchRecord[] = [
    ...formRows.map((f) =>
      record(
        f.id,
        "form",
        route("forms/", f.slug),
        ls(f.titleTh, f.titleEn),
        ls(f.purposeTh, f.purposeEn),
        join(richTextToPlainText(f.descriptionTh), richTextToPlainText(f.descriptionEn), f.titleTh, f.titleEn, f.purposeTh, f.purposeEn),
        100,
        { category: f.category, owner: f.owner },
      ),
    ),
    ...routeRows.map((r) =>
      record(
        r.id,
        "shuttleRoute",
        route("getting-around#route-", r.slug),
        ls(r.nameTh, r.nameEn),
        ls(r.descriptionTh, r.descriptionEn),
        join(r.nameTh, r.nameEn, r.descriptionTh, r.descriptionEn),
        100,
        { category: "transport" },
      ),
    ),
    ...pageRows.map((p) =>
      record(
        p.id,
        p.kind === "welfare" ? "welfarePage" : "guidePage",
        route(`${p.kind}/`, p.slug),
        ls(p.titleTh, p.titleEn),
        ls(p.summaryTh, p.summaryEn),
        join(p.titleTh, p.titleEn, p.summaryTh, p.summaryEn, richTextToPlainText(p.bodyTh), richTextToPlainText(p.bodyEn)),
        60,
        { category: p.category },
      ),
    ),
    ...faqRows.map((q) =>
      record(
        q.id,
        "faq",
        route("faq#", q.id),
        ls(q.questionTh, q.questionEn),
        ls(q.questionTh, q.questionEn),
        join(q.questionTh, q.questionEn, richTextToPlainText(q.answerTh), richTextToPlainText(q.answerEn)),
        50,
        { category: q.category },
      ),
    ),
    ...eventRows.map((e) =>
      record(
        e.id,
        "event",
        route("events/", e.slug),
        ls(e.titleTh, e.titleEn),
        ls(e.summaryTh, e.summaryEn),
        join(e.titleTh, e.titleEn, e.summaryTh, e.summaryEn),
        40,
        { category: e.category, owner: e.owner },
      ),
    ),
    ...newsRows.map((n) =>
      record(
        n.id,
        "newsPost",
        route("news/", n.slug),
        ls(n.titleTh, n.titleEn),
        ls(n.summaryTh, n.summaryEn),
        join(n.titleTh, n.titleEn, n.summaryTh, n.summaryEn),
        20,
        { category: n.category, owner: n.owner },
      ),
    ),
    ...policyRows.map((p) =>
      record(
        p.id,
        "policy",
        route("policy/", p.slug),
        ls(p.titleTh, p.titleEn),
        ls(p.summaryTh, p.summaryEn),
        join(p.titleTh, p.titleEn, p.summaryTh, p.summaryEn, p.policyAreaTh, p.policyAreaEn),
        30,
        { owner: p.owner },
      ),
    ),
    ...orgRows.map((o) =>
      record(
        o.id,
        "organisation",
        route("directory#org-", o.slug),
        ls(o.nameTh, o.nameEn),
        ls(o.facultyTh, o.facultyEn),
        join(o.nameTh, o.nameEn, o.facultyTh, o.facultyEn),
        20,
      ),
    ),
    ...placeRows.map((p) =>
      record(
        p.id,
        "place",
        route("directory#place-", p.slug),
        ls(p.nameTh, p.nameEn),
        ls(p.buildingTh, p.buildingEn),
        join(p.nameTh, p.nameEn, p.buildingTh, p.buildingEn),
        20,
        { category: p.category },
      ),
    ),
    // Only entries still open are indexed. A returned umbrella is a true fact
    // about the past and stays on its own page, but putting it in search means
    // someone hunting for their umbrella today wades through other people's
    // closed entries first. The reference code is in the haystack so pasting
    // "LF-2026-0184" into the site search finds it.
    ...lostFoundRows.map((item) => {
      const place = item.placeId ? lostFoundPlaces.get(item.placeId) : undefined;
      return record(
        item.id,
        "lostFoundItem",
        route("lost-and-found/", item.slug),
        ls(item.titleTh, item.titleEn),
        ls(item.descriptionTh, item.descriptionEn),
        join(
          item.titleTh,
          item.titleEn,
          item.descriptionTh,
          item.descriptionEn,
          item.reference,
          item.locationNoteTh,
          item.locationNoteEn,
          place?.name.th,
          place?.name.en,
        ),
        70,
        { owner: item.owner },
      );
    }),
  ];

  // Canteen dishes and explainers are built in code from the canteen dataset,
  // with canonical aliases folded into the haystack. A canteen problem must
  // never take down site search, so it only ever costs the canteen's records.
  try {
    records.push(...canteenSearchRecords(normaliseCanteenData(await readCanteenData(db))));
  } catch (error) {
    console.error("[content] getSearchIndex could not read the canteen, indexing without it.", error instanceof Error ? error.message : error);
  }

  return { generatedAt: new Date().toISOString(), records };
}

const cachedSearchIndex = cachedRead(
  ["search-index"],
  [CACHE_TAGS.searchIndex],
  REVALIDATE.content,
  () => readSearchIndex(getDb()),
);

/**
 * Every indexable record, for the search page and the client-side combobox.
 * A failed read yields an empty index rather than a failed build: search then
 * finds nothing and says so, which is recoverable, where a build that dies
 * because the database blinked is not.
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  return safeFetch<SearchIndex>("getSearchIndex", () => cachedSearchIndex(), {
    generatedAt: new Date().toISOString(),
    records: [],
  });
}
