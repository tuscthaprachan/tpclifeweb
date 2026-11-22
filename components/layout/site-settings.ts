/**
 * Site-wide chrome content: service name, navigation, help contacts, phase.
 *
 * Reads the `site_settings` singleton from the database, falling back to
 * FALLBACK_SITE_SETTINGS below when there is no such row or the read fails.
 *
 * WHY A FALLBACK RATHER THAN AN EMPTY HEADER
 * This is the only content on the site that every single page depends on. A
 * missing `siteSettings` row must not cost a reader the navigation, the
 * language toggle and the help contacts, because those are how they get
 * anywhere else, including away from a page that is failing. So the fallback
 * is a real, complete, bilingual set of chrome and not a placeholder: the
 * site degrades to "the nav an editor has not customised yet" rather than to
 * a page with no way out.
 *
 * Once a row exists, everything here comes from it as stored: nothing is
 * inserted, reordered or filled in behind the editor's back.
 */

import { getSiteSettings as fetchSiteSettings } from "@/lib/content";
import { DEFAULT_HOME_TASKS, MAX_HOME_TASKS } from "@/lib/content/home-tasks";
import type { SiteSettings } from "@/lib/content/types";

const FALLBACK_SITE_SETTINGS: SiteSettings = {
  _id: "siteSettings-fallback",
  _type: "siteSettings",
  _createdAt: "2026-08-07T00:00:00.000Z",
  _updatedAt: "2026-08-07T00:00:00.000Z",

  serviceName: { th: "#ท้ายท่าพระจันทร์", en: "#trytpc" },
  tagline: {
    th: "ข้อมูลชีวิตนักศึกษาธรรมศาสตร์ท่าพระจันทร์ ทุกเรื่องในที่เดียว",
    en: "Everything a Thammasat Tha Prachan student needs, in one place",
  },

  phase: "alpha",
  phaseNote: {
    th: "บริการนี้เป็นบริการใหม่และยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    en: "This is a new service still being tested. Some information may be incomplete",
  },

  primaryNav: [
    { label: { th: "เริ่มต้น", en: "Start" }, path: "/start" },
    { label: { th: "ชีวิตประจำวัน", en: "Day to day" }, path: "/campus" },
    { label: { th: "เรียนและสอบ", en: "Study" }, path: "/study" },
    { label: { th: "สุขภาพและการดูแล", en: "Health" }, path: "/health" },
    { label: { th: "การเงิน", en: "Money" }, path: "/money" },
    { label: { th: "ขอความช่วยเหลือ", en: "Get help" }, path: "/help" },
    { label: { th: "ส่งเสียงของคุณ", en: "Have your say" }, path: "/have-your-say" },
    { label: { th: "แบบฟอร์ม", en: "Forms" }, path: "/forms" },
    { label: { th: "การเดินทาง", en: "Getting around" }, path: "/getting-around" },
    { label: { th: "กินอะไรดี", en: "What to eat" }, path: "/eat" },
  ],

  footerNav: [
    { label: { th: "คำถามที่พบบ่อย", en: "Common questions" }, path: "/faq" },
    { label: { th: "เกี่ยวกับ", en: "About" }, path: "/about" },
    { label: { th: "ข้อมูลเปิด", en: "Open data" }, path: "/about/open-data" },
    { label: { th: "การเข้าถึงเว็บไซต์", en: "Accessibility" }, path: "/accessibility" },
    { label: { th: "คุกกี้", en: "Cookies" }, path: "/cookies" },
    { label: { th: "ผลการดำเนินงาน", en: "Performance" }, path: "/performance" },
  ],

  /*
   * 3.2.6 Consistent Help. Placeholder contacts only. Real TUSU/TUSC
   * channels live in data/harvested-inventory.ts (harvested from their
   * Linktrees) and should replace these once the CMS is seeded from it.
   */
  homeTasks: [...DEFAULT_HOME_TASKS],

  helpContacts: [
    {
      label: { th: "อมธ. ท่าพระจันทร์", en: "TUSU Tha Prachan" },
      channel: "line",
      value: "https://linktr.ee/TUSU_Tha.pra.chaN",
    },
    {
      label: { th: "สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan" },
      channel: "line",
      value: "https://linktr.ee/tusc.tpc",
    },
  ],

  organisationLinks: [],
};

/**
 * The chrome for the current request. `fetchSiteSettings` already routes
 * through `safeFetch`, so a database outage returns null here rather than
 * throwing, and null and "no row yet" collapse to the same branch: use
 * the fallback.
 *
 * Async, unlike the stub this replaces. Every caller is already an async
 * Server Component, so this costs them an await and nothing else.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return normaliseSiteSettings((await fetchSiteSettings()) ?? FALLBACK_SITE_SETTINGS);
}

/**
 * Shapes the stored settings for rendering without second-guessing the
 * editor: the menus, footer and Popular tiles are exactly what the console
 * holds, in its order. Only the tile count is capped, as the console enforces.
 */
export function normaliseSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    primaryNav: settings.primaryNav ?? [],
    homeTasks: (settings.homeTasks ?? []).slice(0, MAX_HOME_TASKS),
  };
}
