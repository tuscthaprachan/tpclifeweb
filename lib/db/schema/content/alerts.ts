import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { contentColumns } from "./common";
import { alertSeverityEnum, alertSurfaceEnum } from "./enums";

/**
 * Service alerts. Active window query:
 *   status = 'published' and starts_at <= $now and (ends_at is null or ends_at >= $now)
 * ordered by severity desc (enum order is info < warning < critical), starts_at desc.
 */
export const serviceAlerts = pgTable(
  "service_alerts",
  {
    ...contentColumns(),
    titleTh: text("title_th").notNull().default(""),
    titleEn: text("title_en").notNull().default(""),
    bodyTh: text("body_th").notNull().default(""),
    bodyEn: text("body_en").notNull().default(""),
    severity: alertSeverityEnum("severity").notNull().default("info"),
    /** Empty means sitewide. */
    affects: alertSurfaceEnum("affects").array().notNull().default(sql`'{}'`),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    moreInfoUrl: text("more_info_url"),
  },
  (t) => [
    check("service_alerts_window", sql`${t.endsAt} is null or ${t.endsAt} >= ${t.startsAt}`),
    index("service_alerts_active_idx").on(t.status, t.startsAt, t.endsAt),
  ],
);

export type ServiceAlertRow = typeof serviceAlerts.$inferSelect;
