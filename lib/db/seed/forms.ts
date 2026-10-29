import { FORMS } from "../../../data/harvested-inventory";
import { forms } from "../schema/content/forms";
import { excludedSet, published, slugify, type SeedDb } from "./util";

/**
 * The real forms from data/harvested-inventory.ts. A form with no captured
 * destination URL would be seeded as a draft rather than publishing a dead
 * "start now" link.
 *
 * The emergency report and complaint form (a Google Form behind a sign-in) is
 * superseded by the issue reporting service at /complaints, so it is not
 * seeded: no /forms page, search result or home task points at it. It stays in
 * the inventory as a historical record. A database seeded earlier still holds
 * its row; unpublish it at /admin/content/forms.
 */
const SUPERSEDED = new Set(["emergencyReport"]);

export async function seedForms(db: SeedDb): Promise<void> {
  for (const form of FORMS.filter((f) => !SUPERSEDED.has(f.key))) {
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
        destinationType: form.destinationType,
        destinationUrl: hasUrl ? form.destinationUrl : null,
        isActive: true,
        isPriority: form.isPriority,
        lastVerified: "2026-08-16",
      })
      .onConflictDoUpdate({ target: forms.slug, set: excludedSet(forms) });
  }
}
