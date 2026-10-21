/**
 * The shape of every document TryTPC reads out of Sanity.
 *
 * This file is a shared contract between the CMS schemas and every page that
 * renders them. The Sanity schema definitions in `sanity/schemas` must produce
 * exactly these shapes, and page code must not assume anything beyond them.
 *
 * Treat this file as fixed. If a field is genuinely missing, say so rather than
 * widening a type to `any` to get past it.
 */

import type { LocaleString, LocaleText } from "@/lib/i18n/config";

export type { LocaleString, LocaleText };

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

export interface SanityRef {
  _ref: string;
  _type: "reference";
}

export interface SanityImage {
  _type: "siteImage";
  asset: SanityRef;
  /**
   * Required by schema validation. An image with no alt text cannot be
   * published, because 1.1.1 is not negotiable. Decorative images are marked
   * with `isDecorative` instead and render alt="".
   */
  alt?: LocaleString;
  isDecorative?: boolean;
  caption?: LocaleString;
}

export interface SanitySlug {
  _type: "slug";
  current: string;
}

export interface DocumentMeta {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
}

/** Portable Text. Rendered by the shared Prose component, never dangerously set. */
export type PortableTextBlock = {
  _key: string;
  _type: string;
  [key: string]: unknown;
};

export interface LocaleBlock {
  th: PortableTextBlock[];
  en: PortableTextBlock[];
}

/** Which body owns a thing. Every governance item must be attributed. */
export type Owner = "tusu" | "tusc" | "university" | "joint";

/**
 * Semantic fill category. Maps one to one onto the --fill-* tokens, so a
 * category chosen in the CMS drives colour without an editor picking a colour.
 */
export type Category = "transport" | "welfare" | "activity" | "governance";

/* ------------------------------------------------------------------ *
 * Site settings and alerts
 * ------------------------------------------------------------------ */

/** Honest statement of maturity, rendered in the phase banner. */
export type ServicePhase = "alpha" | "beta" | "live";

export interface HelpContact {
  label: LocaleString;
  /** Where the student actually gets a human. LINE, email, phone or a room. */
  channel: "line" | "email" | "phone" | "inPerson" | "url";
  value: string;
  hours?: LocaleString;
}

export interface NavItem {
  label: LocaleString;
  path: string;
  children?: NavItem[];
}

export interface SiteSettings extends DocumentMeta {
  _type: "siteSettings";
  serviceName: LocaleString;
  tagline: LocaleString;
  phase: ServicePhase;
  /** Shown in the phase banner beside the tag. Say what is still missing. */
  phaseNote?: LocaleString;
  primaryNav: NavItem[];
  footerNav: NavItem[];
  /** 3.2.6 Consistent Help. Rendered in the same place on every page. */
  helpContacts: HelpContact[];
  organisationLinks?: ExternalLink[];
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface ServiceAlert extends DocumentMeta {
  _type: "serviceAlert";
  title: LocaleString;
  body: LocaleText;
  severity: AlertSeverity;
  /** Which surfaces this alert appears on. Empty means sitewide. */
  affects?: Array<"shuttle" | "campus" | "forms" | "sitewide">;
  startsAt: string;
  /** Alerts expire. A stale alert is worse than no alert. */
  endsAt?: string;
  moreInfoUrl?: string;
}

/* ------------------------------------------------------------------ *
 * Shuttle bus
 *
 * There is no GPS feed for the Thammasat Tha Prachan shuttle and no public API. Times
 * shown to students are computed from this timetable and must always be
 * labelled as scheduled, never as live. See lib/shuttle.
 * ------------------------------------------------------------------ */

export interface ShuttleStop {
  _key: string;
  name: LocaleString;
  /** Minutes after the route's departure time that this stop is reached. */
  offsetMinutes: number;
  note?: LocaleString;
  lat?: number;
  lng?: number;
}

/** Which days a route runs. Weekday-only service is the norm here. */
export interface ServiceCalendar {
  /** 0 = Sunday through 6 = Saturday, matching Date#getDay. */
  daysOfWeek: number[];
  /** ISO dates (YYYY-MM-DD) on which the service does not run. */
  excludedDates?: string[];
  /** ISO dates on which it runs even though the day of week says otherwise. */
  addedDates?: string[];
  validFrom?: string;
  validUntil?: string;
}

export interface ShuttleRoute extends DocumentMeta {
  _type: "shuttleRoute";
  name: LocaleString;
  slug: SanitySlug;
  description?: LocaleText;
  /** Ordered. First entry is the origin. */
  stops: ShuttleStop[];
  calendar: ServiceCalendar;
  /** Departure times from the origin, "HH:mm" in Asia/Bangkok, ascending. */
  departures: string[];
  fare?: LocaleString;
  notes?: LocaleText;
  /**
   * Set only if a genuine realtime feed ever exists. While this is empty the UI
   * must say "scheduled". Never present a timetable as live tracking.
   */
  realtimeFeedUrl?: string;
  isActive: boolean;
  sourceNote?: LocaleString;
  lastVerified?: string;
}

/* ------------------------------------------------------------------ *
 * Forms
 *
 * The centralised form system. Sanity holds a rich record of every form a
 * student might need; submission still happens on the owner's own system.
 * The point is that the student learns what they need BEFORE they click.
 * ------------------------------------------------------------------ */

export type FormDestination = "googleForm" | "externalSite" | "email" | "inPerson" | "line";

export interface FormPrerequisite {
  _key: string;
  label: LocaleString;
  detail?: LocaleText;
}

export interface FormRecord extends DocumentMeta {
  _type: "form";
  title: LocaleString;
  slug: SanitySlug;
  /** One sentence. What this form is for, in the student's words. */
  purpose: LocaleString;
  description?: LocaleBlock;
  category: Category;
  owner: Owner;

  /** Who may use it. Rendered as the "check a service is suitable" step. */
  audience?: LocaleText;

  /** What to have ready before starting. Rendered as a checklist. */
  prerequisites?: FormPrerequisite[];

  /**
   * Whether the destination demands a sign-in the student may not have. The
   * TPC emergency report form returns 401 to anonymous requests, so this is
   * true for it. Saying so before the click is the whole point (3.3.8).
   */
  requiresSignIn: boolean;
  signInType?: "google" | "tuAccount" | "other";
  signInNote?: LocaleString;

  destinationType: FormDestination;
  destinationUrl?: string;

  /** Realistic, in minutes. Do not flatter the form. */
  estimatedMinutes?: number;
  /** What happens next and how long it takes. */
  turnaround?: LocaleString;
  deadline?: string;
  contact?: HelpContact;

  isActive: boolean;
  /** Surfaced on the home page and ranked above other results in search. */
  isPriority?: boolean;
  lastVerified?: string;
}

/* ------------------------------------------------------------------ *
 * News, events and activity
 * ------------------------------------------------------------------ */

export interface NewsPost extends DocumentMeta {
  _type: "newsPost";
  title: LocaleString;
  slug: SanitySlug;
  summary: LocaleText;
  body: LocaleBlock;
  publishedAt: string;
  owner: Owner;
  category?: Category;
  cover?: SanityImage;
  /**
   * Additional pictures shown under the body, in the order the editor set.
   * Every entry carries the same alt text contract as `cover`: a `SanityImage`
   * is either described in both languages or explicitly `isDecorative`.
   */
  gallery?: SanityImage[];
  tags?: LocaleString[];
}

export interface CampusEvent extends DocumentMeta {
  _type: "event";
  title: LocaleString;
  slug: SanitySlug;
  summary: LocaleText;
  body?: LocaleBlock;
  startsAt: string;
  endsAt?: string;
  /** True when the event is a whole day and no clock time should be shown. */
  isAllDay?: boolean;
  location?: LocaleString;
  place?: CampusPlace | SanityRef;
  owner: Owner;
  category?: Category;
  cover?: SanityImage;
  /** A form the student must file to take part, if there is one. */
  relatedForm?: FormRecord | SanityRef;
  registrationUrl?: string;
  isCancelled?: boolean;
  cancellationNote?: LocaleString;
}

/* ------------------------------------------------------------------ *
 * Policy tracker
 *
 * Combined across TUSU and TUSC but always attributed. TUSC items are often
 * oversight of a TUSU item, and that relationship is shown rather than
 * flattened away.
 * ------------------------------------------------------------------ */

export type PolicyStatus = "notStarted" | "inProgress" | "delivered" | "blocked" | "dropped";

export interface PolicyUpdate {
  _key: string;
  date: string;
  note: LocaleText;
  /** Status as at this update, so the history is readable on its own. */
  status: PolicyStatus;
  author?: LocaleString;
  evidenceUrl?: string;
}

export interface Policy extends DocumentMeta {
  _type: "policy";
  title: LocaleString;
  slug: SanitySlug;
  summary: LocaleText;
  detail?: LocaleBlock;
  owner: Owner;
  policyArea: LocaleString;
  status: PolicyStatus;
  /**
   * Optional and only ever set by hand. When absent the UI shows the latest
   * update instead. Never infer or animate a percentage: a made-up number on a
   * progress bar is a claim nobody made.
   */
  progressPercent?: number;
  startedAt?: string;
  targetDate?: string;
  completedAt?: string;
  /** The TUSU policy this TUSC item scrutinises, where that applies. */
  oversightOf?: Policy | SanityRef;
  updates?: PolicyUpdate[];
  evidenceLinks?: ExternalLink[];
}

/* ------------------------------------------------------------------ *
 * Content pages
 * ------------------------------------------------------------------ */

export interface ExternalLink {
  _key?: string;
  label: LocaleString;
  url: string;
  description?: LocaleString;
  /** True when the destination needs an account the student may not have. */
  requiresSignIn?: boolean;
}

export interface ContentPage extends DocumentMeta {
  _type: "welfarePage" | "guidePage";
  title: LocaleString;
  slug: SanitySlug;
  summary: LocaleText;
  body: LocaleBlock;
  category: Category;
  relatedForms?: Array<FormRecord | SanityRef>;
  relatedLinks?: ExternalLink[];
  relatedPages?: Array<ContentPage | SanityRef>;
  /** Drives the "not reviewed since" view in the Studio. */
  lastReviewed?: string;
  order?: number;
}

export interface Faq extends DocumentMeta {
  _type: "faq";
  question: LocaleString;
  answer: LocaleBlock;
  category: Category;
  relatedForms?: Array<FormRecord | SanityRef>;
  order?: number;
}

/* ------------------------------------------------------------------ *
 * Directory and places
 * ------------------------------------------------------------------ */

export type OrganisationType =
  | "facultyCommittee"
  | "club"
  | "independentGroup"
  | "universityDivision"
  | "studentBody";

export interface OrganisationContact {
  _key: string;
  channel: "instagram" | "facebook" | "line" | "email" | "phone" | "website";
  value: string;
  label?: LocaleString;
}

export interface Organisation extends DocumentMeta {
  _type: "organisation";
  name: LocaleString;
  slug: SanitySlug;
  type: OrganisationType;
  faculty?: LocaleString;
  description?: LocaleText;
  contacts: OrganisationContact[];
  location?: LocaleString;
  isActive: boolean;
}

export interface OpeningHours {
  _key: string;
  /** 0 = Sunday through 6 = Saturday. */
  daysOfWeek: number[];
  opens: string;
  closes: string;
  note?: LocaleString;
}

export interface CampusPlace extends DocumentMeta {
  _type: "place";
  name: LocaleString;
  slug: SanitySlug;
  building?: LocaleString;
  description?: LocaleText;
  category: Category;
  openingHours?: OpeningHours[];
  /** Shown when the place is closed for a reason worth stating. */
  closureNote?: LocaleString;
  lat?: number;
  lng?: number;
  /** True for places students most often need: shown on the at-a-glance panel. */
  isKeyLocation?: boolean;
}

/* ------------------------------------------------------------------ *
 * Lost and found
 *
 * Two halves of one register: things a student has lost, and things someone
 * has handed in. They share a document type so that one list, one search and
 * one filter serve both, and so a match between the two halves is a
 * comparison of like with like rather than of two different shapes.
 *
 * HONESTY, the same rule the shuttle timetable is held to. This register
 * says only what an editor has recorded. It never claims an item has been
 * matched, returned or collected unless someone set that status by hand.
 * `status` is therefore an explicit editorial field with no inferred value,
 * and a `found` item's holding location is stated in words rather than
 * implied by whoever logged it.
 *
 * PRIVACY. A lost property register is a public page about other people's
 * possessions. Nothing here is a place to put a student's name, ID number,
 * phone number or address, and the schema deliberately gives those nowhere
 * to live. A photograph of a found item is a picture of the item, never of
 * the person who handed it in or of the identifying details on its face.
 * Whoever holds the item does the identity check off this website, through
 * `claimContact`.
 * ------------------------------------------------------------------ */

/**
 * Which half of the register a document belongs to.
 *   `lost`  a student has lost this and is looking for it.
 *   `found` someone has handed this in and it is waiting to be collected.
 */
export type LostFoundKind = "lost" | "found";

/**
 * Where an item has got to. Only ever set by an editor.
 *   `open`      still open. A lost item is still missing, a found item is
 *               still waiting to be collected.
 *   `matched`   a possible owner has come forward and it is being checked.
 *   `returned`  back with its owner. The end state that matters.
 *   `unclaimed` the claim window in `claimBy` has passed with nobody
 *               collecting it. Says what happened, not that it vanished.
 *   `withdrawn` the person who logged it asked for it to be taken down, or
 *               it turned out to be logged twice.
 */
export type LostFoundStatus = "open" | "matched" | "returned" | "unclaimed" | "withdrawn";

/**
 * What kind of thing it is. A fixed list, because free text categories make
 * the filter useless and are not translatable. `other` is deliberate: an
 * editor who cannot place an item must not be forced to file it wrongly.
 */
export type LostFoundCategory =
  | "idCard"
  | "bankCard"
  | "keys"
  | "wallet"
  | "phone"
  | "laptop"
  | "bag"
  | "clothing"
  | "book"
  | "stationery"
  | "jewellery"
  | "eyewear"
  | "umbrella"
  | "waterBottle"
  | "other";

export interface LostFoundItem extends DocumentMeta {
  _type: "lostFoundItem";
  /**
   * The short human-readable code a student quotes at the desk, for example
   * "LF-2026-0184". Generated on first save and never reused, so that a
   * conversation about an item does not depend on describing it again.
   */
  reference: string;
  kind: LostFoundKind;
  title: LocaleString;
  slug: SanitySlug;
  /**
   * What the item is, in enough detail to recognise but not enough to claim
   * falsely. Editors are told in the Studio to hold back one identifying
   * detail so a claim can be verified against it.
   */
  description: LocaleText;
  category: LostFoundCategory;
  /** Pictures of the item itself. Never of a person, never of an ID's face. */
  photos?: SanityImage[];
  /** Where on campus it was lost or found, when it is a place the site knows. */
  place?: CampusPlace;
  /** Free text location for anywhere `place` does not cover, including off campus. */
  locationNote?: LocaleString;
  /** The Asia/Bangkok calendar date it was lost or found, "YYYY-MM-DD". */
  occurredOn: string;
  status: LostFoundStatus;
  /**
   * `found` items only. Where the item physically is right now and who is
   * holding it, in words. A student must be able to read this and know which
   * counter to walk to.
   */
  heldAt?: LocaleString;
  /**
   * `found` items only. The date after which the holder stops keeping it.
   * Renders as a deadline, and drives the `unclaimed` status once passed,
   * but only when an editor sets that status. Nothing here expires itself.
   */
  claimBy?: string;
  /** How to start a claim. Reuses the sitewide help contact shape. */
  claimContact?: HelpContact;
  /** Which body is running this entry. Every entry is attributable. */
  owner: Owner;
  publishedAt: string;
  /** When it reached `returned` or `unclaimed`. Set by an editor with the status. */
  resolvedAt?: string;
  /**
   * True when this came in through the public report form rather than being
   * typed in by an editor. A submission arrives as an unpublished draft and
   * is invisible to readers until someone approves it, so this flag records
   * provenance; it is not what controls visibility.
   */
  submittedByStudent?: boolean;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

/**
 * One row of the prebuilt search index. Both languages live in the same record
 * so that typing "shuttle" finds รถรับส่ง and the reverse. `haystack` holds the
 * concatenated searchable text of BOTH languages; the display fields are chosen
 * by the reader's active locale at render time.
 */
export interface SearchRecord {
  id: string;
  type: SearchableType;
  path: { th: string; en: string };
  title: LocaleString;
  summary: LocaleString;
  haystack: string;
  /** Higher ranks first. Forms and live information beat news. */
  weight: number;
  category?: Category;
  owner?: Owner;
}

export type SearchableType =
  | "form"
  | "shuttleRoute"
  | "welfarePage"
  | "guidePage"
  | "faq"
  | "event"
  | "newsPost"
  | "policy"
  | "organisation"
  | "place"
  | "lostFoundItem"
  | "canteenDish"
  | "canonicalDish";

export interface SearchIndex {
  generatedAt: string;
  records: SearchRecord[];
}

/* ------------------------------------------------------------------ *
 * Canteen ("What to eat")
 *
 * One on-campus canteen, maintained by TUSU editors in Sanity. The dish is
 * the primary object; a stall is where you walk to.
 *
 * HONESTY. Every price is a surveyed figure with a "checked on" date, never
 * a current price. Diet fields are the stall's own word. There is NO
 * allergen data anywhere in this model, on purpose, and no operational
 * signal (closed today, sold out, queue, payment method).
 *
 * `canteenDish.stall` and `canteenDish.canonical` are stored as references and
 * `getCanteenData` returns them as references (`{ _ref }`). The pure code in
 * `lib/canteen` joins them with `indexCanteen` in `lib/canteen/derive.ts`, so
 * the whole dataset ships once and filtering is instant on the client.
 * ------------------------------------------------------------------ */

/** Fixed cuisine list for a stall. A stall can have several. */
export type CanteenCuisine =
  | "thaiRice"
  | "madeToOrder"
  | "noodles"
  | "isan"
  | "chickenRice"
  | "curryOverRice"
  | "muslim"
  | "international"
  | "drinks"
  | "desserts"
  | "fruit";

export type DishType =
  | "rice"
  | "noodles"
  | "soup"
  | "curryOverRice"
  | "madeToOrder"
  | "singlePlate"
  | "snack"
  | "drink"
  | "dessert";

/** Drives meal combos: one main, optionally one drink and one dessert. */
export type DishCourse = "main" | "side" | "drink" | "dessert";

export type Protein = "pork" | "chicken" | "beef" | "seafood" | "fish" | "egg" | "tofu" | "none";

/** Allergens a dish probably contains, inferred from its name and usual recipe. Never a guarantee. */
export type Allergen = "peanut" | "treeNut" | "milk" | "egg" | "wheat" | "soy" | "sesame" | "fish" | "shellfish";

export type CookingStyle =
  | "stirFried"
  | "deepFried"
  | "boiled"
  | "grilled"
  | "steamed"
  | "salad"
  | "curry";

export type Temperature = "hot" | "cold";

/** Which edge of the floor plan something sits on. */
export type FloorSide = "north" | "south" | "east" | "west";

/**
 * The outline of a stall on the plan. `rect` fills its cell. The triangles
 * fill half of it, with the right angle at the named corner of the cell and
 * the hypotenuse on the opposite diagonal.
 */
export type MapShape = "rect" | "triangleBottomRight" | "triangleBottomLeft";

/** A rectangle on the floor plan grid. Columns and rows count from 0 at the top left. */
export interface MapCell {
  col: number;
  row: number;
  w: number;
  h: number;
  /** Optional. Defaults to `rect`. */
  shape?: MapShape;
}

export interface CanteenStall extends DocumentMeta {
  _type: "canteenStall";
  name: LocaleString;
  slug: SanitySlug;
  /** As painted on the stall. */
  number: number;
  cuisine: CanteenCuisine[];
  /** A halal stall: everything it sells is halal. */
  halal: boolean;
  /** The whole stall is vegetarian. */
  vegetarianStall?: boolean;
  /** Optional. When absent the canteen's hours apply. */
  hours?: OpeningHours[];
  mapCell: MapCell;
  wayfinding?: LocaleString;
  photo?: SanityImage;
}

/** The taxonomy layer: one per real-world dish, not per stall. */
export interface CanonicalDish extends DocumentMeta {
  _type: "canonicalDish";
  name: LocaleString;
  slug: SanitySlug;
  /** Alternative spellings that feed search, for example krapow, kaprao. */
  aliases?: string[];
  explainer?: LocaleText;
}

/** A priced variant, for example "special" +10 or "add egg" +10. */
export interface DishVariant {
  _key: string;
  label: LocaleString;
  /** Baht added to the base price. Never negative. */
  delta: number;
}

export interface CanteenDish extends DocumentMeta {
  _type: "canteenDish";
  /** As the stall writes it. */
  name: LocaleString;
  /** The Thai name in Latin letters (RTGS, no tones), for ordering out loud. */
  romanised?: string;
  /** The number the stall's board gives the dish, when it numbers its menu. */
  menuNumber?: string;
  slug: SanitySlug;
  stall: SanityRef;
  canonical?: SanityRef;
  /** Baht, the base price as surveyed. */
  price: number;
  variants?: DishVariant[];
  type: DishType;
  course: DishCourse;
  protein: Protein[];
  /** Allergens it probably contains, sauces and batters included. Inferred, not asked. */
  contains?: Allergen[];
  /** Absent for drinks, desserts and anything not cooked to order. */
  style?: CookingStyle;
  temperature: Temperature;
  /** Soupy or with sauce. */
  wet: boolean;
  /** Made without meat, fish or seafood as it normally comes. */
  vegetarian: boolean;
  photo?: SanityImage;
  /** "YYYY-MM-DD", the day the current price was last checked. */
  checkedOn: string;
  /** Drives the "prices not checked" view in the Studio. */
  lastReviewed?: string;
}

/** An entrance to the canteen, positioned on the edge of the floor plan. */
export interface CanteenEntrance {
  _key: string;
  label: LocaleString;
  col: number;
  row: number;
  side: FloorSide;
}

export interface CanteenSeatingZone {
  _key: string;
  label: LocaleString;
  col: number;
  row: number;
  w: number;
  h: number;
}

/** Singleton. Holds the floor plan. */
export interface CanteenSettings extends DocumentMeta {
  _type: "canteenSettings";
  /** The canteen `place`, which carries the hours and the location. */
  canteen?: CampusPlace | SanityRef;
  gridCols: number;
  gridRows: number;
  entrances?: CanteenEntrance[];
  seatingZones?: CanteenSeatingZone[];
  /** Which edge of the plan faces the river. */
  riverSide?: FloorSide;
}

/**
 * Everything the canteen section needs, in one value. Around 300 dishes, so
 * it is shipped once and filtered in memory on the server and the client.
 * `settings` is null until an editor creates the singleton.
 */
export interface CanteenData {
  settings: CanteenSettings | null;
  stalls: CanteenStall[];
  dishes: CanteenDish[];
  canonicals: CanonicalDish[];
}
