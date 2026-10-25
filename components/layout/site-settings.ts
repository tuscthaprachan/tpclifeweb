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
 * The consequence worth knowing is that an editor emptying `primaryNav` in
 * the admin console does NOT empty the site's menu, it restores this list. That is
 * the intended behaviour, and it is why the fallback stays maintained
 * alongside the routes rather than being left to rot.
 */

import { getSiteSettings as fetchSiteSettings } from "@/lib/content";
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
    th: "นี่คือบริการใหม่ที่ยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    en: "This is a new service still being tested. Some information may be incomplete",
  },

  primaryNav: [
    { label: { th: "แบบฟอร์ม", en: "Forms" }, path: "/forms" },
    { label: { th: "การเดินทาง", en: "Getting around" }, path: "/getting-around" },
    { label: { th: "กินอะไรดี", en: "What to eat" }, path: "/eat" },
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
    { label: { th: "ผลการดำเนินงาน", en: "Performance" }, path: "/performance" },
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
 * through `safeFetch`, so a database outage returns null here rather than
 * throwing, and null and "no row yet" collapse to the same branch: use
 * the fallback.
 *
 * Async, unlike the stub this replaces. Every caller is already an async
 * Server Component, so this costs them an await and nothing else.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return withRequiredNav((await fetchSiteSettings()) ?? FALLBACK_SITE_SETTINGS);
}

/**
 * Sections that must always be reachable from the primary navigation, even
 * when the `siteSettings` document in the CMS predates them. An editor can
 * still rename or move one by adding it to the document themselves; it is
 * only inserted when its path is missing, after the item named in `after`.
 */
const REQUIRED_NAV: readonly { item: SiteSettings["primaryNav"][number]; after: string }[] = [
  { item: { label: { th: "กินอะไรดี", en: "What to eat" }, path: "/eat" }, after: "/getting-around" },
];

/**
 * The same for the footer: the Service Standard asks for performance data to
 * be published, so the link to it must not depend on an editor adding it.
 */
const REQUIRED_FOOTER_NAV: readonly { item: SiteSettings["footerNav"][number]; after: string }[] = [
  { item: { label: { th: "ผลการดำเนินงาน", en: "Performance" }, path: "/performance" }, after: "/cookies" },
];

function withRequiredItems(nav: SiteSettings["primaryNav"], required: readonly { item: SiteSettings["primaryNav"][number]; after: string }[]) {
  for (const { item, after } of required) {
    if (nav.some((existing) => existing.path === item.path)) continue;
    const anchor = nav.findIndex((existing) => existing.path === after);
    const at = anchor === -1 ? nav.length : anchor + 1;
    nav = [...nav.slice(0, at), item, ...nav.slice(at)];
  }
  return nav;
}

export function withRequiredNav(settings: SiteSettings): SiteSettings {
  const primaryNav = withRequiredItems(settings.primaryNav ?? [], REQUIRED_NAV);
  const footerNav = settings.footerNav ? withRequiredItems(settings.footerNav, REQUIRED_FOOTER_NAV) : settings.footerNav;
  return primaryNav === settings.primaryNav && footerNav === settings.footerNav ? settings : { ...settings, primaryNav, footerNav };
}
