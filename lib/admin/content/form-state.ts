import type { ContentStatus } from "@/lib/db/schema/content/enums";

/**
 * What a content Server Action returns when it does not redirect, and the
 * conventions shared by the form shell and the actions. Safe to import from
 * client components.
 */

/** Messages keyed by dotted field path ("title.th", "tags.0.en"). Empty when valid. */
export type FieldErrors = Record<string, string>;

export interface ContentFormState {
  errors: FieldErrors;
  /** A problem with the whole form rather than one field. */
  formError?: string;
}

export const EMPTY_FORM_STATE: ContentFormState = { errors: {} };

/** The element id the control for a field path must carry, so the error summary can link to it. */
export function fieldId(path: string): string {
  return `f-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

/** Which button was pressed. */
export type SaveIntent = "save" | "publish" | "unpublish";

export interface ResolvedIntent {
  intent: SaveIntent;
  /** The status to write, or undefined to leave it as it is. */
  status?: ContentStatus;
  /** Whether the row will be live once saved, so completeness rules apply. */
  publishing: boolean;
}

/** Reads the submit button's `intent` value and works out what it means for a row that is `current` (undefined when new). */
export function resolveIntent(formData: FormData, current?: ContentStatus): ResolvedIntent {
  const raw = formData.get("intent");
  const intent: SaveIntent = raw === "publish" || raw === "unpublish" ? raw : "save";
  if (intent === "publish") return { intent, status: "published", publishing: true };
  if (intent === "unpublish") return { intent, status: "draft", publishing: false };
  // Saving a live row keeps it live (and gives it a publication date if it somehow has none).
  return { intent, ...(current === "published" ? { status: "published" as const } : {}), publishing: current === "published" };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a UUID string, so a malformed id in a URL is a 404 rather than a database error. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
