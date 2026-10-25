import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { contentColumns, type ExternalLinkJson, type HelpContactJson, type HomeTaskJson, type NavItemJson } from "./common";
import { servicePhaseEnum } from "./enums";

/**
 * Site settings singleton. `singleton_key` is constrained to 'site' and
 * unique, so a second row is impossible.
 *
 * jsonb is used for the five lists because each is only ever rendered whole,
 * in the header, footer, home page and help panel, and edited as a unit. The nav is a
 * recursive tree (NavItem.children), which a flat child table models badly.
 * The jsonb shapes are exactly the NavItem, HomeTask, HelpContact and ExternalLink
 * types, so the read layer can return them as is.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    ...contentColumns(),
    singletonKey: text("singleton_key").notNull().default("site"),
    serviceNameTh: text("service_name_th").notNull().default(""),
    serviceNameEn: text("service_name_en").notNull().default(""),
    taglineTh: text("tagline_th").notNull().default(""),
    taglineEn: text("tagline_en").notNull().default(""),
    phase: servicePhaseEnum("phase").notNull().default("alpha"),
    phaseNoteTh: text("phase_note_th"),
    phaseNoteEn: text("phase_note_en"),
    primaryNav: jsonb("primary_nav").$type<NavItemJson[]>().notNull().default(sql`'[]'::jsonb`),
    footerNav: jsonb("footer_nav").$type<NavItemJson[]>().notNull().default(sql`'[]'::jsonb`),
    homeTasks: jsonb("home_tasks").$type<HomeTaskJson[]>().notNull().default(sql`'[]'::jsonb`),
    helpContacts: jsonb("help_contacts").$type<HelpContactJson[]>().notNull().default(sql`'[]'::jsonb`),
    organisationLinks: jsonb("organisation_links").$type<ExternalLinkJson[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => [
    check("site_settings_singleton", sql`${t.singletonKey} = 'site'`),
    uniqueIndex("site_settings_singleton_idx").on(t.singletonKey),
  ],
);

export type SiteSettingsRow = typeof siteSettings.$inferSelect;
