/**
 * Site-wide chrome content: service name, navigation, help contacts, phase.
 *
 * TODO(sanity-integration): this is a hardcoded stand-in for a real query
 * against `siteSettings` in Sanity. The sanity agent's `lib/sanity/client.ts`
 * did not exist yet when the shell was built, so this keeps the layout
 * unbuildable-blocking. Swap the body of `getSiteSettings` for a real fetch
 * (e.g. `client.fetch(SITE_SETTINGS_QUERY)`) once that client lands, and
 * delete this comment. The return shape is typed against the real
 * `SiteSettings` contract in `lib/sanity/types.ts` so the swap should be a
 * drop-in.
 */

import type { SiteSettings } from "@/lib/sanity/types";

export function getSiteSettings(): SiteSettings {
  return {
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
}
