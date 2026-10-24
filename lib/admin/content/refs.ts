import "server-only";

import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { listImageChoices, isStorageConfigured } from "./images";
import { loadChoices } from "./list";
import { getContentType } from "./types";
import type { RichTextRefs } from "@/components/admin/content/rich-text/blocks";

/** Pictures and forms for the rich text editor's blocks (and any image or form picker on the same page). */
export async function loadRichTextRefs(db: AuditExecutor = getDb()): Promise<RichTextRefs> {
  const formsType = getContentType("forms")!;
  const [images, forms] = await Promise.all([listImageChoices(db), loadChoices(db, formsType)]);
  return { images, forms, storageConfigured: isStorageConfigured() };
}
