"use server";

/**
 * The public report form's Server Action. This is the one place on the
 * whole site that writes to Sanity from a request nobody has signed into
 * (lib/sanity/env.ts's own comment on `writeToken`), so everything here
 * treats the submitted `FormData` as hostile: every field is revalidated
 * server-side regardless of what the client already checked, per the House
 * Rules and per Next's own guidance (server-actions.md: "Validate inputs.
 * Treat FormData... as untrusted").
 *
 * WRITES A DRAFT, NEVER A PUBLISHED DOCUMENT. The `_id` created below always
 * starts with the literal prefix "drafts.", which is how Sanity itself
 * defines an unpublished document. `lib/sanity/client.ts` reads with
 * `perspective: "published"`, so nothing this action writes is visible to a
 * reader of this site until an editor opens it from the "Waiting for
 * approval" queue (sanity/structure.ts) and publishes it by hand. There is
 * no code path here that calls anything resembling `publish`.
 *
 * REFERENCE ALLOCATION. `reference` has to be unique and is read out loud at
 * a desk, so it has to be short and predictable: "LF-2026-0001", the next
 * year, the next number. Two students submitting in the same second can both
 * read the same "last" reference before either has saved, so the actual
 * uniqueness guarantee comes from the document `_id` being DERIVED from the
 * candidate reference (`drafts.lost-found-2026-0001`) and from `client.create`
 * refusing to create a document over an `_id` that already exists. A
 * collision surfaces as that specific error, which is retried with the next
 * candidate number, bounded, so a burst of simultaneous submissions cannot
 * spin forever.
 *
 * REPORTER PRIVACY. `submitterContact` and `staffVerificationDetail` are not
 * part of the public `LostFoundItem` shape in lib/sanity/types.ts on purpose.
 * They exist only on the Sanity document (sanity/schemas/documents/lostFoundItem.ts
 * adds both, with a Studio description saying they must be cleared before
 * publish), and nothing in app/[locale]/lost-and-found ever reads them back
 * out. The reporter's contact detail never appears on a public page.
 */

import { createClient } from "next-sanity";
import { redirect } from "next/navigation";

import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { apiVersion, dataset, projectId, writeToken } from "@/lib/sanity/env";
import { LOST_FOUND_LAST_REFERENCE_QUERY } from "@/lib/sanity/queries";
import type { LostFoundCategory, LostFoundKind } from "@/lib/sanity/types";

const CATEGORY_VALUES: readonly LostFoundCategory[] = [
  "idCard",
  "bankCard",
  "keys",
  "wallet",
  "phone",
  "laptop",
  "bag",
  "clothing",
  "book",
  "stationery",
  "jewellery",
  "eyewear",
  "umbrella",
  "waterBottle",
  "other",
];

/** How long a real person takes, at minimum, to read the privacy notice and
 * fill in a multi-field form. A bot that posts within this window never
 * looked at the page at all. Deliberately short: the point is to catch
 * scripted, instant submission, not to slow down a fast typist. */
const MIN_FILL_TIME_MS = 1500;

const MAX_REFERENCE_ATTEMPTS = 8;

export type LostFoundReportFieldError = "kind" | "title" | "category" | "description" | "occurredOn" | "location" | "contact" | "form";

export interface LostFoundReportValues {
  kind: LostFoundKind;
  title: string;
  category: LostFoundCategory | "";
  description: string;
  staffDetail: string;
  place: string;
  locationNote: string;
  day: string;
  month: string;
  year: string;
  contact: string;
}

export interface LostFoundReportState {
  errors: Partial<Record<LostFoundReportFieldError, string>>;
  values: LostFoundReportValues;
}

function readValues(formData: FormData): LostFoundReportValues {
  return {
    kind: formData.get("kind") === "found" ? "found" : "lost",
    title: String(formData.get("title") ?? "").trim(),
    category: String(formData.get("category") ?? "") as LostFoundCategory | "",
    description: String(formData.get("description") ?? "").trim(),
    staffDetail: String(formData.get("staffDetail") ?? "").trim(),
    place: String(formData.get("place") ?? ""),
    locationNote: String(formData.get("locationNote") ?? "").trim(),
    day: String(formData.get("occurredOn-day") ?? "").trim(),
    month: String(formData.get("occurredOn-month") ?? "").trim(),
    year: String(formData.get("occurredOn-year") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim(),
  };
}

/** Validates the three DateInput parts into a real, non-future "YYYY-MM-DD". */
function toIsoDate(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(`${iso}T00:00:00Z`);
  // Rejects a date that does not survive round-tripping (for example 31 April), which `new Date` otherwise silently rolls over into May.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null;
  // No future dates: the item cannot have been lost or found ahead of today, Bangkok time.
  if (iso > bangkokDateKey()) return null;
  return iso;
}

function validate(values: LostFoundReportValues, locale: Locale): Partial<Record<LostFoundReportFieldError, string>> {
  const errors: Partial<Record<LostFoundReportFieldError, string>> = {};

  if (!values.title) errors.title = UI.errorFieldRequired[locale];
  if (!values.description) errors.description = UI.errorFieldRequired[locale];
  if (!values.category || !(CATEGORY_VALUES as readonly string[]).includes(values.category)) {
    errors.category = UI.errorFieldRequired[locale];
  }
  if (!toIsoDate(values.day, values.month, values.year)) errors.occurredOn = UI.errorInvalidDate[locale];
  if (!values.place && !values.locationNote) errors.location = UI.errorLocationRequired[locale];
  if (!values.contact) errors.contact = UI.errorFieldRequired[locale];

  return errors;
}

function writeClient() {
  // `perspective: "raw"` (rather than the shared `client`'s "published") is
  // required here for two reasons: this client has to be able to CREATE a
  // draft at all, and LOST_FOUND_LAST_REFERENCE_QUERY has to see references
  // already allocated to other pending, unpublished drafts, or two reports
  // filed before the first is approved could be handed the same number.
  return createClient({ projectId, dataset, apiVersion, token: writeToken, useCdn: false, perspective: "raw" });
}

function isDocumentExistsError(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number; response?: { statusCode?: number } } | undefined)?.statusCode
    ?? (error as { response?: { statusCode?: number } } | undefined)?.response?.statusCode;
  if (statusCode === 409) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
}

function receivedPath(locale: Locale, reference: string | null): string {
  const query = reference ? `?ref=${encodeURIComponent(reference)}` : "";
  return localePath(locale, `/lost-and-found/report/received${query}`);
}

export async function submitLostFoundReport(
  prevState: LostFoundReportState,
  formData: FormData,
): Promise<LostFoundReportState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
  const values = readValues(formData);

  // Anti-spam. Neither check is announced: telling an automated submitter
  // exactly what it tripped only teaches it how to pass next time. A real
  // reader never fills the honeypot (it is aria-hidden and off the tab
  // order, see ReportForm.tsx) and never finishes a multi-field bilingual
  // form faster than MIN_FILL_TIME_MS, so both are treated as spam and the
  // submission is quietly dropped rather than written to Sanity at all. No
  // reference is issued for a dropped submission, since issuing one for a
  // report that does not exist would itself be dishonest.
  const honeypot = String(formData.get("website") ?? "").trim();
  const renderedAt = Date.parse(String(formData.get("renderedAt") ?? ""));
  const tookLongEnough = Number.isFinite(renderedAt) && Date.now() - renderedAt >= MIN_FILL_TIME_MS;
  if (honeypot !== "" || !tookLongEnough) {
    redirect(receivedPath(locale, null));
  }

  if (!writeToken) {
    return { errors: { form: UI.reportUnavailable[locale] }, values };
  }

  const errors = validate(values, locale);
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  const occurredOn = toIsoDate(values.day, values.month, values.year);
  if (!occurredOn) {
    // Unreachable given the validate() call above, but keeps the type
    // narrowed without a non-null assertion.
    return { errors: { occurredOn: UI.errorInvalidDate[locale] }, values };
  }

  const client = writeClient();
  const now = new Date();
  const year = now.getUTCFullYear();

  let startNumber = 1;
  try {
    const last = await client.fetch<string | null>(LOST_FOUND_LAST_REFERENCE_QUERY);
    if (last) {
      const match = /^LF-(\d{4})-(\d{4})$/.exec(last);
      if (match && Number(match[1]) === year) startNumber = Number(match[2]) + 1;
    }
  } catch {
    // An unreadable register does not block a new report: fall back to 0001
    // and let the create-time uniqueness check (drafts.lost-found-...) catch
    // any collision the same way it would for a burst of concurrent reports.
  }

  const localeText = { th: locale === "th" ? values.title : "", en: locale === "en" ? values.title : "" };
  const localeDescription = { th: locale === "th" ? values.description : "", en: locale === "en" ? values.description : "" };
  const localeLocationNote = values.locationNote
    ? { th: locale === "th" ? values.locationNote : "", en: locale === "en" ? values.locationNote : "" }
    : undefined;

  let allocatedReference: string | null = null;
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const number = startNumber + attempt;
    const reference = `LF-${year}-${String(number).padStart(4, "0")}`;
    // Deterministic from the reference, not random: this is the actual
    // uniqueness check. A second submission racing for the same number
    // collides on this exact id and gets retried with the next one.
    const id = `drafts.lost-found-${year}-${String(number).padStart(4, "0")}`;

    try {
      await client.create({
        _id: id,
        _type: "lostFoundItem",
        reference,
        kind: values.kind,
        title: localeText,
        // The slug is derived from the reference, not the (possibly
        // single-language, possibly Thai-script) title: Studio's own slug
        // source function only runs inside the Studio UI, never against a
        // document created through the API, and a reference is already
        // unique, URL-safe and stable.
        slug: { _type: "slug", current: reference.toLowerCase() },
        description: localeDescription,
        category: values.category,
        place: values.place ? { _type: "reference", _ref: values.place } : undefined,
        locationNote: localeLocationNote,
        occurredOn,
        status: "open",
        // No student reporting a lost or found item is in a position to say
        // which body administers this register; that is an editorial
        // decision. "tusc" is a starting default an editor corrects during
        // review, not a claim about who is actually handling this item.
        owner: "tusc",
        publishedAt: now.toISOString(),
        submittedByStudent: true,
        submitterContact: values.contact,
        staffVerificationDetail: values.staffDetail || undefined,
      });
      allocatedReference = reference;
      break;
    } catch (error) {
      if (!isDocumentExistsError(error)) {
        return { errors: { form: UI.errorReportNotSaved[locale] }, values };
      }
      // Collision: another submission took this exact reference first. Loop
      // to the next candidate number.
    }
  }

  if (!allocatedReference) {
    return { errors: { form: UI.errorReportNotSaved[locale] }, values };
  }

  redirect(receivedPath(locale, allocatedReference));
}
