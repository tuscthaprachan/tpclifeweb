"use server";

/**
 * The public report form's Server Action. This is the one place on the
 * whole site that writes to the database from a request nobody has signed
 * into, so everything here treats the submitted `FormData` as hostile: every
 * field is revalidated server-side regardless of what the client already
 * checked, per the House Rules and per Next's own guidance (server-actions.md:
 * "Validate inputs. Treat FormData... as untrusted").
 *
 * WRITES A DRAFT, NEVER A PUBLISHED ROW. The row is inserted with
 * `status = 'draft'` ("waiting for approval"). Every public read goes through
 * the `lost_found_public` view, which shows published rows only, so nothing
 * this action writes is visible to a reader of this site until staff open it
 * from the approval queue and publish it by hand. There is no code path here
 * that sets `published`. For the same reason it does not revalidate any cache:
 * a draft changes nothing a reader can see, and an action anyone can call must
 * not be a way to evict the cache.
 *
 * REFERENCE ALLOCATION. `reference` has to be unique and is read out loud at
 * a desk, so it has to be short and predictable: "LF-2026-0001", the next
 * year, the next number. `nextLostFoundReference` (lib/db/references.ts)
 * takes it from a per-year counter row inside the same transaction that
 * inserts the report, so two students submitting in the same second are
 * serialised on that row and can never be handed the same number, there is no
 * retry loop, and a report that fails to save gives its number back. The
 * `unique` constraint on `lost_found_items.reference` is only a backstop. The
 * year is the Bangkok calendar year.
 *
 * AUDIT. The insert and one `audit_log` row (`lost_found_item.report`, no
 * actor because nobody is signed in, with a request id to correlate it with the
 * server log) commit or roll back together via `withAudit`. The audit row
 * records the reference, kind and category only: it is append-only and kept
 * for good, so it must not hold the reporter's contact detail.
 *
 * REPORTER PRIVACY. `submitter_contact` and `staff_verification_detail` are
 * columns of `lost_found_items` that the public `lost_found_public` view
 * leaves out, and `LostFoundItem` in lib/content/types.ts has nowhere to put
 * them. Nothing in app/[locale]/lost-and-found ever reads them back out. The
 * reporter's contact detail never appears on a public page.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb, isDatabaseConfigured } from "@/lib/db";
import { withAudit } from "@/lib/db/audit";
import { nextLostFoundReference } from "@/lib/db/references";
import { lostFoundItems } from "@/lib/db/schema";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { LostFoundCategory, LostFoundKind } from "@/lib/content/types";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How long a real person takes, at minimum, to read the privacy notice and
 * fill in a multi-field form. A bot that posts within this window never
 * looked at the page at all. Deliberately short: the point is to catch
 * scripted, instant submission, not to slow down a fast typist. */
const MIN_FILL_TIME_MS = 1500;

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
  if (values.place && !UUID.test(values.place)) errors.location = UI.errorLocationRequired[locale];
  else if (!values.place && !values.locationNote) errors.location = UI.errorLocationRequired[locale];
  if (!values.contact) errors.contact = UI.errorFieldRequired[locale];

  return errors;
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
  // submission is quietly dropped rather than written to the database at all. No
  // reference is issued for a dropped submission, since issuing one for a
  // report that does not exist would itself be dishonest.
  const honeypot = String(formData.get("website") ?? "").trim();
  const renderedAt = Date.parse(String(formData.get("renderedAt") ?? ""));
  const tookLongEnough = Number.isFinite(renderedAt) && Date.now() - renderedAt >= MIN_FILL_TIME_MS;
  if (honeypot !== "" || !tookLongEnough) {
    redirect(receivedPath(locale, null));
  }

  if (!isDatabaseConfigured()) {
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

  // The Bangkok calendar year, so a report filed just after midnight on 1 January gets the new year's number.
  const year = Number(bangkokDateKey().slice(0, 4));

  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-vercel-id") ?? requestHeaders.get("x-request-id") ?? crypto.randomUUID();

  // The reporter writes in one language; the other side stays empty until staff translate it on approval.
  const inLocale = (text: string) => ({ th: locale === "th" ? text : "", en: locale === "en" ? text : "" });
  const title = inLocale(values.title);
  const description = inLocale(values.description);
  const locationNote = inLocale(values.locationNote);

  let allocatedReference: string;
  try {
    allocatedReference = await withAudit(getDb(), { actorUserId: null, requestId }, async (tx, audit) => {
      const reference = await nextLostFoundReference(tx, year);
      const [row] = await tx
        .insert(lostFoundItems)
        .values({
          reference,
          // The slug is derived from the reference, not the (possibly
          // single-language, possibly Thai-script) title: a reference is
          // already unique, URL-safe and stable.
          slug: reference.toLowerCase(),
          kind: values.kind,
          titleTh: title.th,
          titleEn: title.en,
          descriptionTh: description.th,
          descriptionEn: description.en,
          category: values.category as LostFoundCategory,
          placeId: values.place || null,
          locationNoteTh: values.locationNote ? locationNote.th : null,
          locationNoteEn: values.locationNote ? locationNote.en : null,
          occurredOn,
          registerStatus: "open",
          // Waiting for approval. Public reads only ever see published rows.
          status: "draft",
          // No student reporting a lost or found item is in a position to say
          // which body administers this register; that is a staff decision.
          // "tusc" is a starting default staff correct during review, not a
          // claim about who is actually handling this item.
          owner: "tusc",
          submittedByStudent: true,
          submitterContact: values.contact,
          staffVerificationDetail: values.staffDetail || null,
        })
        .returning({ id: lostFoundItems.id });
      await audit({
        action: "lost_found_item.report",
        entityType: "lost_found_item",
        entityId: row!.id,
        after: { reference, kind: values.kind, category: values.category, status: "draft" },
      });
      return reference;
    });
  } catch (error) {
    // Server log only: the reporter is told it was not saved, never why.
    console.error("[lost-found] report not saved", error instanceof Error ? error.message : error);
    return { errors: { form: UI.errorReportNotSaved[locale] }, values };
  }

  redirect(receivedPath(locale, allocatedReference));
}
