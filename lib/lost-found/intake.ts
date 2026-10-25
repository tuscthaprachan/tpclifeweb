/**
 * Desk intake: an officer logs a found item, or a walk-in lost report.
 *
 * A found item becomes a `found` case (status `logged`, not yet public) plus a
 * linked DRAFT listing that shares the case's reference. The officer then adds
 * photos, storage location, the hidden verification detail and the finder's
 * contact (all optional or encrypted as appropriate), and "Publish to the
 * public list" moves the case to `listed` and publishes the listing. Nothing
 * is public until then.
 *
 * A walk-in lost report is a `lost` case on behalf of the person, with their
 * contact (encrypted) and a draft listing that follows the same approval as a
 * report sent in online.
 */

import { createCase, transition } from "@/lib/cases/engine";
import type { ContactInput } from "@/lib/cases/contacts";
import { assertStaff, lockCase, touchCase } from "@/lib/cases/internal";
import { eq } from "drizzle-orm";
import { cases } from "@/lib/db/schema";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import type { LostFoundCategory } from "@/lib/content/types";
import type { LOST_FOUND_CATEGORIES } from "@/lib/db/schema/content/enums";
import type { Locale } from "@/lib/i18n/config";
import { ownerFor } from "./common";
import { getCaseDetails, initCaseDetails } from "./details";
import { contentActorOf, createDraftListing, expireListing, getListingForCase, listingGaps, publishListingForCase, updateListingForCase, type Bilingual, type ListingGap } from "./listing";
import { countPrivatePhotos } from "./photos";

type Category = (typeof LOST_FOUND_CATEGORIES)[number];

export interface ItemDescription {
  category: Category;
  title: Bilingual;
  description: Bilingual;
  placeId: string | null;
  locationNote: Bilingual;
  /** The Asia/Bangkok calendar date, "YYYY-MM-DD". */
  occurredOn: string;
}

/** Either language may be filled first; at least one of the title and one of the description is needed to save. */
export function descriptionProblems(input: Pick<ItemDescription, "title" | "description" | "placeId" | "locationNote">): Array<"title" | "description" | "location"> {
  const problems: Array<"title" | "description" | "location"> = [];
  if (!input.title.th.trim() && !input.title.en.trim()) problems.push("title");
  if (!input.description.th.trim() && !input.description.en.trim()) problems.push("description");
  if (!input.placeId && !input.locationNote.th.trim() && !input.locationNote.en.trim()) problems.push("location");
  return problems;
}

/**
 * A short staff-facing summary with no personal data, for the inbox: the
 * category as the public side names it, then the title, both in the staff
 * member's language (the title falls back to the other language).
 */
export function summaryOf(category: string, title: Bilingual, staffLocale: Locale = "en"): string {
  const other = staffLocale === "th" ? "en" : "th";
  const text = (title[staffLocale].trim() || title[other].trim()).slice(0, 120);
  return `${categoryLabel(category as LostFoundCategory, staffLocale)}: ${text}`;
}

export interface LoggedItem {
  caseId: string;
  reference: string;
  listingId: string;
}

/** Logs a found item: the case, its draft listing and the details row, in one transaction. */
export async function logFoundItem(db: AuditExecutor, input: ItemDescription, actor: StaffActor, opts: { now?: Date; locale?: "th" | "en"; staffLocale?: Locale } = {}): Promise<LoggedItem> {
  const now = opts.now ?? new Date();
  const problems = descriptionProblems(input);
  if (problems.length > 0) throw new CaseError("invalid", `Missing: ${problems.join(", ")}.`);
  return db.transaction(async (tx) => {
    const created = await createCase(
      tx,
      { service: "lost_found", kind: "found", summary: summaryOf(input.category, input.title, opts.staffLocale), locale: opts.locale ?? null, owningOrganisationId: actor.organisationId },
      actor,
      { now },
    );
    const listingId = await createDraftListing(
      tx,
      {
        caseId: created.id,
        reference: created.reference,
        kind: "found",
        category: input.category,
        title: input.title,
        description: input.description,
        placeId: input.placeId,
        locationNote: input.locationNote,
        occurredOn: input.occurredOn,
        owner: await ownerFor(tx, actor.organisationId),
        submittedByStudent: false,
      },
      contentActorOf(actor),
      now,
    );
    await initCaseDetails(tx, created.id, actor.organisationId, now);
    return { caseId: created.id, reference: created.reference, listingId };
  });
}

/** Changes the description of a logged item (and the summary the inbox shows). */
export async function updateItemDescription(db: AuditExecutor, caseId: string, input: ItemDescription, actor: StaffActor, opts: { now?: Date; staffLocale?: Locale } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  const problems = descriptionProblems(input);
  if (problems.length > 0) throw new CaseError("invalid", `Missing: ${problems.join(", ")}.`);
  await db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    const done = await updateListingForCase(tx, caseId, input, contentActorOf(actor), now);
    if (!done) throw new CaseError("not_found", "This case has no listing.");
    await touchCase(tx, caseId, actor, now, { summary: summaryOf(input.category, input.title, opts.staffLocale) });
  });
  await expireListing(db, caseId);
}

export type IntakeTask = "describe" | "photos" | "storage" | "verification" | "finder" | "publish";

export interface IntakeProgress {
  status: string;
  listingStatus: "draft" | "published" | null;
  described: boolean;
  /** What stops the listing being published (a language or the place). */
  gaps: ListingGap[];
  photos: number;
  storageDone: boolean;
  verificationDone: boolean;
  finderDone: boolean;
  /** The listing text and place are in place, so it can be published. */
  canPublish: boolean;
  /** Strongly recommended and still missing. They warn on the publish step; they do not block it. */
  warnings: PublishWarning[];
}

/** What is worth having before publishing but is not required. */
export type PublishWarning = "storage" | "verification";

export function publishWarnings(details: { storageOrganisationId: number | null; storageShelf: string | null; hasVerificationDetail: boolean }): PublishWarning[] {
  const warnings: PublishWarning[] = [];
  if (!details.storageOrganisationId || !details.storageShelf) warnings.push("storage");
  if (!details.hasVerificationDetail) warnings.push("verification");
  return warnings;
}

/** What is done and what is missing for a found item's intake, for the task list. */
export async function intakeProgress(db: AuditExecutor, caseId: string, hasFinder: boolean): Promise<IntakeProgress> {
  const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  const [listing, details, photos] = await Promise.all([getListingForCase(db, caseId), getCaseDetails(db, caseId), countPrivatePhotos(db, caseId)]);
  const gaps = listing ? listingGaps(listing) : (["title_th", "title_en", "description_th", "description_en", "location"] as ListingGap[]);
  const storageDone = Boolean(details.storageOrganisationId && details.storageShelf);
  return {
    status: row.status,
    listingStatus: listing?.status ?? null,
    described: Boolean(listing),
    gaps,
    photos,
    storageDone,
    verificationDone: details.hasVerificationDetail,
    finderDone: hasFinder,
    canPublish: gaps.length === 0,
    warnings: publishWarnings(details),
  };
}

/**
 * "Publish to the public list": moves the case to `listed` and publishes the
 * listing, together. Throws `ListingIncompleteError` (naming what is missing)
 * unless the listing has both languages and a place or a note about where. The
 * storage location and the hidden verification detail are strongly
 * recommended, not required: what is missing comes back as warnings for the
 * publish step to show. A case that is already listed just has its listing
 * published again if it had been taken down.
 */
export async function publishFoundItem(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<PublishWarning[]> {
  const now = opts.now ?? new Date();
  const warnings = await db.transaction(async (tx) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    if (row.service !== "lost_found" || row.kind !== "found") throw new CaseError("invalid", "Only a found item can be published to the list.");
    const missing = publishWarnings(await getCaseDetails(tx, caseId));
    await publishListingForCase(tx, caseId, contentActorOf(actor), now);
    if (row.status === "logged") await transition(tx, caseId, "listed", actor, { now });
    return missing;
  });
  await expireListing(db, caseId);
  return warnings;
}

export interface WalkInLost extends ItemDescription {
  locale: "th" | "en";
  contact: Omit<ContactInput, "role">;
}

/** Logs a lost report taken at the desk on behalf of someone, with their contact (encrypted) and a draft listing. */
export async function logWalkInLostReport(db: AuditExecutor, input: WalkInLost, actor: StaffActor, opts: { now?: Date; env?: PiiEnv; staffLocale?: Locale } = {}): Promise<LoggedItem> {
  const now = opts.now ?? new Date();
  const problems = descriptionProblems(input);
  if (problems.length > 0) throw new CaseError("invalid", `Missing: ${problems.join(", ")}.`);
  return db.transaction(async (tx) => {
    const created = await createCase(
      tx,
      {
        service: "lost_found",
        kind: "lost",
        summary: summaryOf(input.category, input.title, opts.staffLocale),
        locale: input.locale,
        owningOrganisationId: actor.organisationId,
        contacts: [{ ...input.contact, role: "reporter" }],
      },
      actor,
      { now, env: opts.env },
    );
    const listingId = await createDraftListing(
      tx,
      {
        caseId: created.id,
        reference: created.reference,
        kind: "lost",
        category: input.category,
        title: input.title,
        description: input.description,
        placeId: input.placeId,
        locationNote: input.locationNote,
        occurredOn: input.occurredOn,
        owner: await ownerFor(tx, actor.organisationId),
        submittedByStudent: true,
      },
      contentActorOf(actor),
      now,
    );
    return { caseId: created.id, reference: created.reference, listingId };
  });
}

