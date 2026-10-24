"use server";

import type { ContentFormState } from "@/lib/admin/content/form-state";
import { deletePage, savePage } from "../_pages/save";

/** Create (id null) or update a welfare page. Bound to the page with `.bind(null, id)`. */
export async function saveWelfarePage(id: string | null, prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  return savePage("welfare", id, prev, formData);
}

/** Deletes a welfare page and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteWelfarePage(id: string): Promise<void> {
  return deletePage("welfare", id);
}
