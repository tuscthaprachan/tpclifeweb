"use server";

import type { ContentFormState } from "@/lib/admin/content/form-state";
import { deletePage, savePage } from "../_pages/save";

/** Create (id null) or update a topic page. Bound to the page with `.bind(null, id)`. */
export async function saveTopicPage(id: string | null, prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  return savePage(id, prev, formData);
}

/** Deletes a topic page and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteTopicPage(id: string): Promise<void> {
  return deletePage(id);
}
