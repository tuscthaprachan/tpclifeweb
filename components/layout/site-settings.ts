/**
 * Site-wide chrome content: service name, navigation, help contacts, phase.
 *
 * Reads the `siteSettings` singleton out of Sanity, falling back to
 * FALLBACK_SITE_SETTINGS below when there is no such document or the read
 * fails.
 *
 * WHY A FALLBACK RATHER THAN AN EMPTY HEADER
 * This is the only content on the site that every single page depends on. A
 * missing `siteSettings` document must not cost a reader the navigation, the
 * language toggle and the help contacts, because those are how they get
 * anywhere else, including away from a page that is failing. So the fallback
 * is a real, complete, bilingual set of chrome and not a placeholder: the
 * site degrades to "the nav an editor has not customised yet" rather than to
 * a page with no way out.
 *
 * The consequence worth knowing is that an editor emptying `primaryNav` in
 * the Studio does NOT empty the site's menu, it restores this list. That is
 * the intended behaviour, and it is why the fallback stays maintained
 * alongside the routes rather than being left to rot.
 */

import { getSiteSettings as fetchSiteSettings } from "@/lib/sanity/queries";
import type { SiteSettings } from "@/lib/sanity/types";

const FALLBACK_SITE_SETTINGS: SiteSettings = {
  _id: "siteSettings-fallback",
  _type: "siteSettings",
  _createdAt: "2026-08-07T00:00:00.000Z",
  _updatedAt: "2026-08-07T00:00:00.000Z",

  serviceName: { th: "ท้ายท่าพระจันทร์", en: "TPC Life" },
  tagline: {
    th: "ข้อมูลชีวิตนักศึกษาท่าพระจันทร์ ทุกเรื่องในที่เดียว",
    en: "Everything a Tha Prachan student needs, in one place",
  },

  phase: "alpha",
  phaseNote: {
    th: "นี่คือบริการใหม่ที่ยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    en: "This is a new service still being tested. Some information may be incomplete",
  },

  primaryNav: [
    { label: { th: "แบบฟอร์ม", en: "Forms" }, path: "/forms" },
    { label: { th: "การเดินทาง", en: "Getting around" }, path: "/getting-around" },
    { label: { th: "สวัสดิการนักศึกษา", en: "Student welfare" }, path: "/welfare" },
    { label: { th: "ข่าวสาร", en: "News" }, path: "/news" },
    { label: { th: "กิจกรรม", en: "Events" }, path: "/events" },
    { label: { th: "ของหายและของเก็บได้", en: "Lost and found" }, path: "/lost-and-found" },
    { label: { th: "ความคืบหน้านโยบาย", en: "Policy progress" }, path: "/policy" },
    { label: { th: "ทำเนียบชุมนุมและหน่วยงาน", en: "Directory" }, path: "/directory" },
  ],

  footerNav: [
    { label: { th: "คำถามที่พบบ่อย", en: "Common questions" }, path: "/faq" },
    { label: { th: "เกี่ยวกับ", en: "About" }, path: "/about" },
    { label: { th: "การเข้าถึง", en: "Accessibility" }, path: "/accessibility" },
    { label: { th: "คุกกี้", en: "Cookies" }, path: "/cookies" },
  ],

  /*
   * 3.2.6 Consistent Help. Placeholder contacts only. Real TUSU/TUSC
   * channels live in data/harvested-inventory.ts (harvested from their
   * Linktrees) and should replace these once the CMS is seeded from it.
   */
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
 * through `safeFetch`, so a Sanity outage returns null here rather than
 * throwing, and null and "no document yet" collapse to the same branch: use
 * the fallback.
 *
 * Async, unlike the stub this replaces. Every caller is already an async
 * Server Component, so this costs them an await and nothing else.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return (await fetchSiteSettings()) ?? FALLBACK_SITE_SETTINGS;
}
