/**
 * The shape of every document TPC Life reads out of Sanity.
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
  _type: "image";
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
 * There is no GPS feed for the Tha Prachan shuttle and no public API. Times
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
  | "place";

export interface SearchIndex {
  generatedAt: string;
  records: SearchRecord[];
}
