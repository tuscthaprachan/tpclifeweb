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
 *
 * The equipment request form (a Google Form, with four paper forms to download
 * and upload) is replaced by the borrowing service at /borrow. Its entry stays
 * in the index, because people look for it there, but starts the new service:
 * no sign-in, no Google Form. The bare path redirects to the reader's language.
 */
const SUPERSEDED = new Set(["emergencyReport"]);
const REPLACED: Record<string, { destinationUrl: string }> = { equipmentRequest: { destinationUrl: "/borrow" } };

export async function seedForms(db: SeedDb): Promise<void> {
  for (const form of FORMS.filter((f) => !SUPERSEDED.has(f.key))) {
    const replaced = REPLACED[form.key];
    const destinationUrl = replaced?.destinationUrl ?? form.destinationUrl;
    const hasUrl = Boolean(destinationUrl);
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
        requiresSignIn: replaced ? false : form.requiresSignIn,
        signInType: replaced ? null : form.signInType,
        destinationType: replaced ? "externalSite" : form.destinationType,
        destinationUrl: hasUrl ? destinationUrl : null,
        isActive: true,
        isPriority: form.isPriority,
        lastVerified: "2026-08-16",
      })
      .onConflictDoUpdate({ target: forms.slug, set: excludedSet(forms) });
  }
}
