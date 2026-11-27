import "server-only";

import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { listImageChoices, isStorageConfigured } from "./images";
import { forms } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { collectRichTextRefs } from "@/lib/rich-text/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { listOrder } from "./list";
import { getContentType } from "./types";
import { isUuid } from "./form-state";
import type { RichTextRefs } from "@/components/admin/content/rich-text/blocks";

/** Pictures and forms for the rich text editor's blocks (and any image or form picker on the same page). */
export async function loadRichTextRefs(db: AuditExecutor = getDb(), selectedImageIds: readonly string[] = [], docs: readonly (RichTextDoc | null | undefined)[] = []): Promise<RichTextRefs> {
  const formsType = getContentType("forms")!;
  const referenced = docs.map(collectRichTextRefs);
  const imageIds = [...selectedImageIds, ...referenced.flatMap((refs) => refs.imageIds).filter(isUuid)];
  const formIds = [...new Set(referenced.flatMap((refs) => refs.formIds).filter(isUuid))];
  const selection = {
    id: forms.id, slug: forms.slug, titleTh: forms.titleTh, titleEn: forms.titleEn,
    purposeTh: forms.purposeTh, purposeEn: forms.purposeEn, requiresSignIn: forms.requiresSignIn,
    signInType: forms.signInType, isActive: forms.isActive,
  };
  const [images, rows] = await Promise.all([
    listImageChoices(db, imageIds),
    db.select(selection).from(forms).orderBy(...listOrder(formsType, "updated", "desc")).limit(1000),
  ]);
  const found = new Set(rows.map((row) => row.id));
  const missing = formIds.filter((id) => !found.has(id));
  if (missing.length) rows.push(...await db.select(selection).from(forms).where(inArray(forms.id, missing)));
  return {
    images,
    forms: rows.map((row) => {
      const title = { th: row.titleTh, en: row.titleEn };
      return {
        value: row.id,
        label: title,
        preview: {
          id: row.id,
          slug: row.slug,
          title,
          purpose: { th: row.purposeTh, en: row.purposeEn },
          requiresSignIn: row.requiresSignIn,
          signInType: row.signInType ?? undefined,
          isActive: row.isActive,
        },
      };
    }),
    storageConfigured: isStorageConfigured(),
  };
}
