import type { ContentStatus } from "@/lib/db/schema/content/enums";
import type { AuditExecutor } from "@/lib/db/audit";
import type { Locale } from "@/lib/i18n/config";
import { validatePageForm } from "../_pages/validate";

/** The guide page form's checks; shared with the other kind of page. */
export function validateGuidePageForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  return validatePageForm(db, { ...input, kind: "guide" });
}
