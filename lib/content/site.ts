import "server-only";

import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { serviceAlerts, siteSettings } from "@/lib/db/schema";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { iso, isoOrUndefined, ls, lsOpt, opt } from "./map";
import { safeFetch } from "./safe-fetch";
import type { ServiceAlert, SiteSettings } from "./types";

/* ------------------------------------------------------------------ *
 * Site settings
 * ------------------------------------------------------------------ */

export async function readSiteSettings(db: AuditExecutor): Promise<SiteSettings | null> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.status, "published")).limit(1);
  if (!row) return null;
  return {
    _id: row.id,
    _type: "siteSettings",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    serviceName: ls(row.serviceNameTh, row.serviceNameEn),
    tagline: ls(row.taglineTh, row.taglineEn),
    phase: row.phase,
    phaseNote: lsOpt(row.phaseNoteTh, row.phaseNoteEn),
    primaryNav: row.primaryNav,
    footerNav: row.footerNav,
    helpContacts: row.helpContacts,
    organisationLinks: row.organisationLinks.length > 0 ? row.organisationLinks : undefined,
  };
}

const cachedSiteSettings = cachedRead(["site-settings"], [CACHE_TAGS.siteSettings], REVALIDATE.content, () =>
  readSiteSettings(getDb()),
);

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return safeFetch<SiteSettings | null>("getSiteSettings", () => cachedSiteSettings(), null);
}

/* ------------------------------------------------------------------ *
 * Service alerts
 * ------------------------------------------------------------------ */

/**
 * Alerts that are live at `now`: started, and either never ends or ends in
 * the future. Critical first (the severity enum is declared least to most
 * severe), then newest.
 */
export async function readActiveServiceAlerts(db: AuditExecutor, now: string): Promise<ServiceAlert[]> {
  const at = new Date(now);
  const rows = await db
    .select()
    .from(serviceAlerts)
    .where(
      and(
        eq(serviceAlerts.status, "published"),
        lte(serviceAlerts.startsAt, at),
        or(isNull(serviceAlerts.endsAt), gte(serviceAlerts.endsAt, at)),
      ),
    )
    .orderBy(desc(serviceAlerts.severity), desc(serviceAlerts.startsAt), serviceAlerts.id);
  return rows.map((row) => ({
    _id: row.id,
    _type: "serviceAlert",
    _createdAt: iso(row.createdAt),
    _updatedAt: iso(row.updatedAt),
    title: ls(row.titleTh, row.titleEn),
    body: ls(row.bodyTh, row.bodyEn),
    severity: row.severity,
    affects: row.affects.length > 0 ? row.affects : undefined,
    startsAt: iso(row.startsAt),
    endsAt: isoOrUndefined(row.endsAt),
    moreInfoUrl: opt(row.moreInfoUrl),
  }));
}

/** Evaluated when the cache entry is filled, so the entry lives for `REVALIDATE.live` seconds at most. */
const cachedActiveAlerts = cachedRead(["service-alerts"], [CACHE_TAGS.serviceAlert], REVALIDATE.live, () =>
  readActiveServiceAlerts(getDb(), new Date().toISOString()),
);

/**
 * Passing `now` reads straight from the database, uncached, for a caller that
 * needs the alerts live at a specific moment. Without it the read is cached for
 * a minute and invalidated when an alert changes, which is how alerts stay
 * current without a live subscription.
 */
export async function getActiveServiceAlerts(now?: string): Promise<ServiceAlert[]> {
  return safeFetch<ServiceAlert[]>(
    "getActiveServiceAlerts",
    () => (now ? readActiveServiceAlerts(getDb(), now) : cachedActiveAlerts()),
    [],
  );
}
