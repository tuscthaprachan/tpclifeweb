"use server";

import type { ContentFormState } from "@/lib/admin/content/form-state";
import { deletePage, savePage } from "../_pages/save";

/** Create (id null) or update a guide page. Bound to the page with `.bind(null, id)`. */
export async function saveGuidePage(id: string | null, prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  return savePage("guide", id, prev, formData);
}

/** Deletes a guide page and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteGuidePage(id: string): Promise<void> {
  return deletePage("guide", id);
}
