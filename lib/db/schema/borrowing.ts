import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { cases } from "./cases";
import { faculties } from "./content/faculties";

/**
 * Equipment borrowing (lib/borrowing), additive to the case engine's tables. A
 * request is a `cases` row (service `borrowing`, kind `loan`) plus one
 * `borrowing_requests` row and a `borrowing_lines` row per item. The borrower
 * lives in `case_contacts` (role `borrower`) as for every service.
 *
 * The paper forms this replaces (one per category: sport, recreation, radio,
 * first aid) asked for the same things every time: who, which body, what and
 * how many, which event, where, why, from when until when, an agreement to six
 * terms, and a signature. Staff then signed approve or decline, and at return
 * both sides signed the condition. Here the signature is the terms being
 * accepted at a recorded time, and each staff decision is an audited event.
 */

/**
 * The four kinds of equipment, each with the rules the paper form for it
 * carried. `notice_working_days` is how far ahead a request must be made (3 on
 * every form; the radio form's Google Form page asks for 7). `max_per_request`
 * caps the total of a category in one request (radios: 13). `deposit_cards`
 * is how many student or national ID cards a borrower leaves at collection
 * (radios: 2). `terms_*` is the category's own term, shown after the shared
 * ones, one per line.
 */
export const equipmentCategories = pgTable(
  "equipment_categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    key: text("key").notNull().unique(),
    nameTh: text("name_th").notNull(),
    nameEn: text("name_en").notNull(),
    hintTh: text("hint_th").notNull().default(""),
    hintEn: text("hint_en").notNull().default(""),
    noticeWorkingDays: integer("notice_working_days").notNull().default(3),
    maxPerRequest: integer("max_per_request"),
    depositCards: integer("deposit_cards").notNull().default(1),
    termsTh: text("terms_th").notNull().default(""),
    termsEn: text("terms_en").notNull().default(""),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("equipment_categories_key_format", sql`${t.key} ~ '^[a-z][a-z0-9-]{0,39}$'`),
    check("equipment_categories_notice", sql`${t.noticeWorkingDays} between 0 and 30`),
    check("equipment_categories_max", sql`${t.maxPerRequest} is null or ${t.maxPerRequest} >= 1`),
    check("equipment_categories_deposit", sql`${t.depositCards} between 0 and 5`),
  ],
);

/**
 * One kind of item and how many of it the desk holds. `total_quantity` is
 * everything owned; `out_of_service` is how many are broken, lost or away for
 * repair, so the number that can be lent is the difference. Units are not
 * tracked one by one: the paper forms never did, and every unit of a kind is
 * interchangeable. `unit_*` is the Thai classifier and its English word
 * (ลูก ball, อัน piece, เครื่อง set, ชุด kit). `max_per_request` caps one item
 * in a request, under the category cap.
 */
export const equipmentItems = pgTable(
  "equipment_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => equipmentCategories.id),
    slug: text("slug").notNull().unique(),
    nameTh: text("name_th").notNull(),
    nameEn: text("name_en").notNull(),
    hintTh: text("hint_th").notNull().default(""),
    hintEn: text("hint_en").notNull().default(""),
    unitTh: text("unit_th").notNull().default("อัน"),
    unitEn: text("unit_en").notNull().default("item"),
    totalQuantity: integer("total_quantity").notNull().default(0),
    outOfService: integer("out_of_service").notNull().default(0),
    maxPerRequest: integer("max_per_request"),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("equipment_items_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{0,63}$'`),
    check("equipment_items_quantities", sql`${t.totalQuantity} >= 0 and ${t.outOfService} >= 0 and ${t.outOfService} <= ${t.totalQuantity}`),
    check("equipment_items_max", sql`${t.maxPerRequest} is null or ${t.maxPerRequest} >= 1`),
    index("equipment_items_category_idx").on(t.categoryId, t.position),
  ],
);

export const BORROWER_KINDS = ["group", "personal"] as const;
export type BorrowerKind = (typeof BORROWER_KINDS)[number];

/** What was left at the desk at collection. No card number is ever stored. */
export const DEPOSIT_KINDS = ["student_card", "national_id_card", "other"] as const;
export type DepositKind = (typeof DEPOSIT_KINDS)[number];

/**
 * One row per request. The loan period is `collect_at` to `return_due_at`
 * (Bangkok times chosen by the borrower). The event, venue and purpose say
 * what the equipment is for and are not personal data; the student number and
 * a non-Thammasat affiliation are, so they are AES-256-GCM ciphertext
 * (lib/crypto/pii.ts) cleared by retention with the contacts.
 *
 * `terms_version` names the wording accepted (lib/borrowing/terms.ts), so a
 * later change to the terms never rewrites what a person agreed to.
 *
 * The staff columns record the three signatures on the paper form: the
 * decision (`decided_at`), the handover with the deposit held and the
 * condition checked (`collected_at`, `deposit_*`, `handover_checked`), and the
 * return with its condition (`returned_at`, per line in `borrowing_lines`).
 * `compensation_baht` is set when something came back damaged or not at all;
 * `settled_at` when it was paid or waived.
 */
export const borrowingRequests = pgTable(
  "borrowing_requests",
  {
    caseId: uuid("case_id")
      .primaryKey()
      .references(() => cases.id),
    borrowerKind: text("borrower_kind").notNull(),
    groupName: text("group_name"),
    eventName: text("event_name").notNull(),
    venue: text("venue").notNull(),
    purpose: text("purpose").notNull(),
    collectAt: timestamp("collect_at", { withTimezone: true }).notNull(),
    returnDueAt: timestamp("return_due_at", { withTimezone: true }).notNull(),
    studentIdEnc: text("student_id_enc"),
    facultyId: uuid("faculty_id").references(() => faculties.id),
    affiliationEnc: text("affiliation_enc"),
    termsVersion: text("terms_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    handoverChecked: boolean("handover_checked").notNull().default(false),
    depositKind: text("deposit_kind"),
    depositCount: integer("deposit_count"),
    depositReturnedAt: timestamp("deposit_returned_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    compensationBaht: integer("compensation_baht"),
    compensationNote: text("compensation_note"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    settlement: text("settlement"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("borrowing_requests_kind", sql`${t.borrowerKind} in ('group', 'personal')`),
    check("borrowing_requests_group", sql`${t.borrowerKind} = 'personal' or ${t.groupName} is not null`),
    check("borrowing_requests_period", sql`${t.returnDueAt} > ${t.collectAt}`),
    check("borrowing_requests_deposit_kind", sql`${t.depositKind} is null or ${t.depositKind} in ('student_card', 'national_id_card', 'other')`),
    check("borrowing_requests_compensation", sql`${t.compensationBaht} is null or ${t.compensationBaht} >= 0`),
    check("borrowing_requests_settlement", sql`${t.settlement} is null or ${t.settlement} in ('paid', 'waived', 'replaced')`),
    index("borrowing_requests_period_idx").on(t.collectAt, t.returnDueAt),
  ],
);

/**
 * The items on a request. `quantity` is what is lent (staff may lower it when
 * approving). At return each unit is counted once as good, damaged or lost,
 * so `returned_good + damaged + lost = quantity` once the return is recorded.
 */
export const borrowingLines = pgTable(
  "borrowing_lines",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: uuid("case_id")
      .notNull()
      .references(() => borrowingRequests.caseId),
    itemId: uuid("item_id")
      .notNull()
      .references(() => equipmentItems.id),
    quantity: integer("quantity").notNull(),
    returnedGood: integer("returned_good"),
    damaged: integer("damaged"),
    lost: integer("lost"),
  },
  (t) => [
    check("borrowing_lines_quantity", sql`${t.quantity} >= 1`),
    check(
      "borrowing_lines_return",
      sql`(${t.returnedGood} is null and ${t.damaged} is null and ${t.lost} is null) or (${t.returnedGood} >= 0 and ${t.damaged} >= 0 and ${t.lost} >= 0 and ${t.returnedGood} + ${t.damaged} + ${t.lost} = ${t.quantity})`,
    ),
    uniqueIndex("borrowing_lines_case_item_unique").on(t.caseId, t.itemId),
    index("borrowing_lines_item_idx").on(t.itemId),
  ],
);

/**
 * A request in progress, kept between question pages without JavaScript, as
 * for complaints: a random token in an httpOnly cookie, the answers encrypted
 * in `data_enc` (bound to the row id), short expiry, swept on each new journey.
 */
export const borrowingJourneys = pgTable("borrowing_journeys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenHash: text("token_hash").notNull().unique(),
  dataEnc: text("data_enc").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type EquipmentCategoryRow = typeof equipmentCategories.$inferSelect;
export type EquipmentItemRow = typeof equipmentItems.$inferSelect;
export type BorrowingRequestRow = typeof borrowingRequests.$inferSelect;
export type BorrowingLineRow = typeof borrowingLines.$inferSelect;
export type BorrowingJourneyRow = typeof borrowingJourneys.$inferSelect;
