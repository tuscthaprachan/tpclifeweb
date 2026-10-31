import { and, eq, sql } from "drizzle-orm";
import { STUDENT_BODIES } from "../../../data/harvested-inventory";
import { DEFAULT_HOME_TASKS } from "../../content/home-tasks";
import { siteSettings } from "../schema/content/site";
import { excludedSet, published, type SeedDb } from "./util";

/**
 * The site settings singleton, the site-wide settings. Alpha on
 * purpose: the register is new and the timetables carry unverified caveats.
 */

const nav = (th: string, en: string, path: string) => ({ label: { th, en }, path });

export async function seedSiteSettings(db: SeedDb): Promise<void> {
  const values = {
    ...published(),
    singletonKey: "site",
    serviceNameTh: "#ท้ายท่าพระจันทร์",
    serviceNameEn: "#trytpc",
    taglineTh: "ข้อมูลชีวิตนักศึกษาธรรมศาสตร์ท่าพระจันทร์ ทุกเรื่องในที่เดียว",
    taglineEn: "Everything a Thammasat Tha Prachan student needs, in one place",
    phase: "alpha" as const,
    phaseNoteTh: "นี่คือบริการใหม่ที่ยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    phaseNoteEn: "This is a new service still being tested. Some information may be incomplete",
    primaryNav: [
      nav("แบบฟอร์ม", "Forms", "/forms"),
      nav("การเดินทาง", "Getting around", "/getting-around"),
      nav("กินอะไรดี", "What to eat", "/eat"),
      nav("สวัสดิการนักศึกษา", "Student welfare", "/welfare"),
      nav("ข่าวสาร", "News", "/news"),
      nav("กิจกรรม", "Events", "/events"),
      nav("ของหายและของเก็บได้", "Lost and found", "/lost-and-found"),
      nav("ความคืบหน้านโยบาย", "Policy progress", "/policy"),
      nav("ทำเนียบชุมนุมและหน่วยงาน", "Directory", "/directory"),
    ],
    footerNav: [
      nav("คำถามที่พบบ่อย", "Common questions", "/faq"),
      nav("เกี่ยวกับ", "About", "/about"),
      nav("ข้อมูลเปิด", "Open data", "/about/open-data"),
      nav("การเข้าถึง", "Accessibility", "/accessibility"),
      nav("คุกกี้", "Cookies", "/cookies"),
      nav("ผลการดำเนินงาน", "Performance", "/performance"),
    ],
    homeTasks: [...DEFAULT_HOME_TASKS],
    helpContacts: [
      { label: STUDENT_BODIES.tusu.name, channel: "url" as const, value: STUDENT_BODIES.tusu.linktree },
      { label: STUDENT_BODIES.tusc.name, channel: "url" as const, value: STUDENT_BODIES.tusc.linktree },
      {
        label: { th: "อีเมลสภานักศึกษา ท่าพระจันทร์", en: "Email TUSC Tha Prachan" },
        channel: "email" as const,
        value: STUDENT_BODIES.tusc.email,
      },
    ],
    organisationLinks: [
      {
        label: { th: "อมธ. ท่าพระจันทร์ บน Instagram", en: "TUSU Tha Prachan on Instagram" },
        url: `https://www.instagram.com/${STUDENT_BODIES.tusu.instagram}/`,
      },
      {
        label: { th: "สภานักศึกษา ท่าพระจันทร์ บน Instagram", en: "TUSC Tha Prachan on Instagram" },
        url: `https://www.instagram.com/${STUDENT_BODIES.tusc.instagram}/`,
      },
      {
        label: { th: "สภานักศึกษา ท่าพระจันทร์ บน Facebook", en: "TUSC Tha Prachan on Facebook" },
        url: `https://www.facebook.com/${STUDENT_BODIES.tusc.facebook}/`,
      },
    ],
  };
  await db
    .insert(siteSettings)
    .values(values)
    .onConflictDoUpdate({ target: siteSettings.singletonKey, set: excludedSet(siteSettings, ["homeTasks"]) });
  await db
    .update(siteSettings)
    .set({ homeTasks: [...DEFAULT_HOME_TASKS] })
    .where(and(eq(siteSettings.singletonKey, "site"), sql`jsonb_array_length(${siteSettings.homeTasks}) = 0`));
}
