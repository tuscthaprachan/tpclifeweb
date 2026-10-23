import { FORMS } from "../../../data/harvested-inventory";
import { forms } from "../schema/content/forms";
import { excludedSet, published, slugify, type SeedDb } from "./util";

/**
 * The two real forms from data/harvested-inventory.ts. A form with no captured
 * destination URL would be seeded as a draft rather than publishing a dead
 * "start now" link (both have one today, so both are published).
 */

const EMERGENCY_REPORT_SIGN_IN_NOTE = {
  en: "Requires a Google account. The form rejects submissions from anyone not signed in (confirmed 7 August 2026).",
  th: "ต้องเข้าสู่ระบบด้วยบัญชี Google เท่านั้น ระบบปฏิเสธการส่งแบบฟอร์มจากผู้ที่ไม่ได้เข้าสู่ระบบ (ตรวจสอบแล้วเมื่อวันที่ 7 สิงหาคม 2569)",
};

export async function seedForms(db: SeedDb): Promise<void> {
  for (const form of FORMS) {
    const isEmergency = form.key === "emergencyReport";
    const hasUrl = Boolean(form.destinationUrl);
    await db
      .insert(forms)
      .values({
        ...published(),
        ...(hasUrl ? {} : { status: "draft" as const, publishedAt: null }),
        slug: slugify(form.title.en),
        titleTh: form.title.th,
        titleEn: form.title.en,
        purposeTh: form.purpose.th,
        purposeEn: form.purpose.en,
        category: form.category,
        owner: form.owner,
        requiresSignIn: form.requiresSignIn,
        signInType: form.signInType,
        signInNoteTh: isEmergency ? EMERGENCY_REPORT_SIGN_IN_NOTE.th : null,
        signInNoteEn: isEmergency ? EMERGENCY_REPORT_SIGN_IN_NOTE.en : null,
        destinationType: form.destinationType,
        destinationUrl: hasUrl ? form.destinationUrl : null,
        isActive: true,
        isPriority: form.isPriority,
        lastVerified: isEmergency ? "2026-08-07" : "2026-08-16",
      })
      .onConflictDoUpdate({ target: forms.slug, set: excludedSet(forms) });
  }
}
