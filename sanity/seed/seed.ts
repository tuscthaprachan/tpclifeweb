/**
 * Seeds Sanity with the real content already researched in
 * data/harvested-inventory.ts. This is a starting point for editors, not a
 * replacement for them: see the header of that file for where each fact came
 * from and what still needs a human to confirm it.
 *
 * WHAT THIS CREATES
 *   - The one `siteSettings` singleton, id exactly "siteSettings" because
 *     sanity/structure.ts pins the Settings desk item to that id. It carries
 *     the service name, the two navigation lists, the phase banner and the
 *     help contacts. `components/layout/site-settings.ts` has a complete
 *     fallback for when it is absent, so this does not make the site work;
 *     it puts the chrome under editorial control instead of requiring a
 *     developer and a deploy to change the menu.
 *   - `organisation` documents for the 23 real organisations in ORGANISATIONS.
 *   - `form` documents for the 2 real forms in FORMS, both published. The
 *     emergency report form's 401-to-anonymous-requests finding is carried
 *     into its `signInNote`, translated into both languages. The equipment
 *     request form's `destinationUrl` was missing when this script last ran;
 *     it has since been captured from TUSU's linktree and is now published
 *     too (see FORMS[1] in the data file).
 *   - Two `guidePage` documents that collect EXTERNAL_SERVICES and
 *     SOURCE_DOCUMENTS as `relatedLinks`. Neither set belongs to a page that
 *     exists yet, so a guide page is the honest home for them (see the
 *     comment above GUIDE_PAGES below for why relatedLinks was chosen over
 *     rewriting each source as page content).
 *   - Two `guidePage` documents, "about-tusu" and "about-tusc", built from
 *     STUDENT_BODIES.
 *   - Two `shuttleRoute` documents, "shuttleRoute-sanamChai" and
 *     "shuttleRoute-pinklao", built from SHUTTLE_ROUTES. See the long comment
 *     above buildShuttleRouteDoc below for exactly what is, and is not,
 *     confirmed about them.
 *
 * WHAT THIS PREVIOUSLY DID NOT CREATE, AND WHY THAT CHANGED
 *   Earlier versions of this script refused to create any `shuttleRoute`,
 *   because the only published timetable was an image in an Instagram post
 *   and inventing structured departure times from it would have been worse
 *   than showing none. That blocker is gone: the site owner supplied two
 *   official timetable graphics on 16 August 2026, transcribed into
 *   SHUTTLE_ROUTES in data/harvested-inventory.ts. What those graphics do
 *   not publish (travel time between stops, and which term the timetable
 *   applies to) is recorded honestly on the documents themselves, not
 *   invented; see buildShuttleRouteDoc's comment below.
 *
 * Every `needsVerification` note that is not carried into a document is
 * printed to the console at the end of the run instead, so running this
 * script surfaces exactly what still needs a human, rather than silently
 * dropping it.
 *
 * HOW TO RUN
 *   Needs a Sanity API token with write access: Studio -> manage.sanity.io ->
 *   API -> Tokens -> Add API token, "Editor" permission is enough. Needs the
 *   same NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET as the
 *   app itself (see .env.example). Never the read token: this script writes.
 *
 *     npx tsx --env-file=.env.local sanity/seed/seed.ts
 *
 *   or, with the variables already exported in the shell:
 *
 *     SANITY_API_WRITE_TOKEN=sk... npx tsx sanity/seed/seed.ts
 *
 *   `tsx` (already in node_modules, pulled in transitively) resolves the
 *   plain extensionless relative imports below the same way the rest of the
 *   app's bundler does. Plain `node` cannot run this file directly: Node's
 *   own native TypeScript support requires an explicit `.ts` extension on
 *   every relative import, but the project's tsconfig.json (outside this
 *   agent's owned directories, so not something this script can change)
 *   does not set `allowImportingTsExtensions`, and `tsc --noEmit` rejects
 *   imports written with one. `tsx` is the option that satisfies both.
 *   Every document below is written with `createOrReplace` against a
 *   deterministic `_id` (for example `organisation-basictpc`), so running
 *   this script again updates the same documents instead of duplicating
 *   them. Those ids are built by `docId` and must never contain a dot; see
 *   the comment on that function for what breaks if they do.
 */

import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

import {
  EXTERNAL_SERVICES,
  FACULTY_NAME_SPELLING_NOTE,
  FORMS,
  ORGANISATIONS,
  SHUTTLE_ROUTES,
  SOURCE_DOCUMENTS,
  STUDENT_BODIES,
  TRANSPORT,
} from "../../data/harvested-inventory";
import type { LocaleString, LocaleText } from "../../lib/i18n/config";
import { apiVersion, dataset, projectId } from "../../lib/sanity/env";
import type {
  ExternalLink,
  FormRecord,
  Organisation,
  OrganisationContact,
  OrganisationType,
  ShuttleRoute,
  ShuttleStop,
} from "../../lib/sanity/types";

/* ------------------------------------------------------------------ *
 * Client
 *
 * A dedicated write client, separate from lib/sanity/client.ts (which
 * deliberately never carries a token, so a client component can never
 * accidentally see draft content). SANITY_API_READ_TOKEN cannot mutate
 * anything even if it were used here; a write token is required.
 * ------------------------------------------------------------------ */

function requireWriteToken(): string {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Missing environment variable SANITY_API_WRITE_TOKEN. Create a token with " +
        "write access at manage.sanity.io (Editor permission is enough) and pass it, " +
        "for example: SANITY_API_WRITE_TOKEN=sk... npx tsx sanity/seed/seed.ts",
    );
  }
  return token;
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: requireWriteToken(),
  useCdn: false,
  perspective: "raw",
});

/* ------------------------------------------------------------------ *
 * Small builders
 * ------------------------------------------------------------------ */

/** A short, stable-enough key for array items. Sanity requires one on every object in an array. */
function key(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

/** Mirrors the `options.source` slugify Sanity Studio applies, so a hand-picked slug reads the same way an editor's would. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slug(current: string) {
  return { _type: "slug" as const, current };
}

/**
 * Builds a deterministic document id, joined with a hyphen and with any dots
 * in the key removed.
 *
 * A published document's id MUST NOT contain a dot. Sanity's default
 * public-read grant is `_id in path("*")`, which matches only dot-free ids:
 * that single wildcard is precisely how a published document is told apart
 * from its `drafts.`-prefixed counterpart. Give a published document a dotted
 * id and it falls on the drafts side of that filter, so anonymous readers
 * cannot see it at all.
 *
 * That failure is silent and badly misleading. The Studio, which reads with a
 * logged-in editor's credentials, shows the content perfectly, while the site
 * reads through `lib/sanity/client.ts`, which carries no token by design, gets
 * nothing back, and renders its empty states. It looks like the site is
 * ignoring the CMS rather than like a permissions problem.
 *
 * Instagram handles in data/harvested-inventory.ts contain dots (for example
 * `res.tu.official`), which is how this arose.
 */
function docId(type: string, name: string): string {
  return `${type}-${name.replace(/\./g, "-")}`;
}

/** One plain paragraph block, the minimum valid `bodyPortableText` content. */
function paragraph(text: string) {
  return {
    _type: "block" as const,
    _key: key(),
    style: "normal" as const,
    markDefs: [],
    children: [{ _type: "span" as const, _key: key(), text, marks: [] }],
  };
}

/* ------------------------------------------------------------------ *
 * Organisations
 *
 * ORGANISATIONS gives only one language for most names: the organisation's
 * own English display name, exactly as printed in its Instagram bio or the
 * link tree that named it (a handful of clubs at Thammasat operate entirely
 * in English). A couple of entries also carry `nameTh`, a Thai name that was
 * captured separately. Using the same string for both `th` and `en` where
 * only one was captured is not a translation, invented or otherwise: it is
 * the organisation's real, single name, written the same way in both
 * fields because there is no second name to put there. Inventing a Thai
 * gloss of an English proper noun would be worse.
 * ------------------------------------------------------------------ */

interface HarvestedOrganisation {
  name: string;
  handle: string;
  type: OrganisationType;
  faculty?: { th: string; en: string };
  nameTh?: string;
}

function organisationName(org: HarvestedOrganisation): LocaleString {
  return { th: org.nameTh ?? org.name, en: org.name };
}

/**
 * Instagram and Facebook contact values are stored as the bare handle, per
 * `sanity/schemas/objects/organisationContact.ts`'s own field description
 * ("just the handle without the @ or full URL") and per
 * `components/domain/directory/contactHref.ts`, the already-built component
 * that turns a stored handle into `https://www.instagram.com/{handle}` at
 * render time. Storing the full URL here instead would make that component
 * double it up into a broken link, so the bare handle is the correct value
 * even though it reads oddly next to the URL a student eventually lands on.
 */
function organisationContacts(org: HarvestedOrganisation): OrganisationContact[] {
  return [{ _key: key(), channel: "instagram", value: org.handle }];
}

function buildOrganisationDoc(org: HarvestedOrganisation) {
  return {
    _id: docId("organisation", org.handle),
    _type: "organisation" as const,
    name: organisationName(org),
    slug: slug(slugify(org.name)),
    type: org.type,
    ...(org.faculty ? { faculty: org.faculty } : {}),
    contacts: organisationContacts(org),
    isActive: true,
  } satisfies Omit<Organisation, "_createdAt" | "_updatedAt">;
}

const ORGANISATION_DOCS = ORGANISATIONS.map((org) => buildOrganisationDoc(org));

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

const EMERGENCY_REPORT_SIGN_IN_NOTE: LocaleString = {
  en: "Requires a Google account. The form rejects submissions from anyone not signed in (confirmed 7 August 2026).",
  th: "ต้องเข้าสู่ระบบด้วยบัญชี Google เท่านั้น ระบบปฏิเสธการส่งแบบฟอร์มจากผู้ที่ไม่ได้เข้าสู่ระบบ (ตรวจสอบแล้วเมื่อวันที่ 7 สิงหาคม 2569)",
};

function buildFormDoc(form: (typeof FORMS)[number]) {
  const isEmergencyReport = form.key === "emergencyReport";
  // A form needs somewhere to send the student before it can honestly be
  // published; see the schema's own destinationUrl validation in
  // sanity/schemas/documents/form.ts. Both real forms have one now, but this
  // stays a check rather than a hardcoded assumption, so a future form
  // added to FORMS without a captured URL yet still lands as a draft
  // instead of publishing a dead "start now" link.
  const hasDestinationUrl = "destinationUrl" in form && Boolean(form.destinationUrl);

  return {
    _id: hasDestinationUrl ? docId("form", form.key) : `drafts.${docId("form", form.key)}`,
    _type: "form" as const,
    title: form.title,
    slug: slug(slugify(form.title.en)),
    purpose: form.purpose,
    category: form.category,
    owner: form.owner,
    requiresSignIn: form.requiresSignIn,
    signInType: form.signInType,
    ...(isEmergencyReport ? { signInNote: EMERGENCY_REPORT_SIGN_IN_NOTE } : {}),
    destinationType: form.destinationType,
    ...(hasDestinationUrl ? { destinationUrl: form.destinationUrl } : {}),
    isActive: true,
    isPriority: form.isPriority,
    ...(isEmergencyReport ? { lastVerified: "2026-08-07" } : {}),
    ...(form.key === "equipmentRequest" ? { lastVerified: "2026-08-16" } : {}),
  } satisfies Omit<FormRecord, "_createdAt" | "_updatedAt">;
}

const FORM_DOCS = FORMS.map(buildFormDoc);

/* ------------------------------------------------------------------ *
 * Guide pages: useful services and reference documents
 *
 * EXTERNAL_SERVICES and SOURCE_DOCUMENTS are both flat lists of outbound
 * links, which is exactly the shape `ContentPage.relatedLinks` (an array of
 * `externalLink`) already exists for. Neither set belongs to an existing
 * welfare or guide page (this seed script is the only content seeder so
 * far, so there is nothing to attach them to), so each becomes its own
 * short guidePage whose real content is its link list, rather than an
 * attempt to rewrite a PDF or a booking system's own UI as prose here.
 *
 * SOURCE_DOCUMENTS' `note` fields, unlike EXTERNAL_SERVICES', are private
 * English-only annotations left for whoever transcribes them (see the file
 * header: "Sections of the TU91 handbook to re-author..."), not reader-
 * facing copy, and there is no verified Thai side for them. They are
 * deliberately left out of the published `description` rather than given an
 * invented Thai translation. The one exception is the shuttle timetable
 * link, whose caveat is important enough, and simple enough, to translate
 * explicitly: it is the one thing CONTRIBUTING.md's Honesty section calls
 * out by name.
 * ------------------------------------------------------------------ */

function externalLinkFromService(service: (typeof EXTERNAL_SERVICES)[number]): ExternalLink {
  return {
    _key: key(),
    label: service.name,
    url: service.url,
    ...("note" in service ? { description: service.note } : {}),
    requiresSignIn: service.requiresSignIn,
  };
}

const SHUTTLE_TIMETABLE_DESCRIPTION: LocaleString = {
  en: "Published only as an image in an Instagram post, not as a timetable on this site.",
  th: "เผยแพร่เป็นเพียงภาพในโพสต์ Instagram เท่านั้น ยังไม่ใช่ตารางเวลาบนเว็บไซต์นี้",
};

function externalLinkFromDocument(doc: (typeof SOURCE_DOCUMENTS)[number]): ExternalLink {
  return {
    _key: key(),
    label: doc.title,
    url: doc.url,
    ...(doc.key === "shuttleTimetable" ? { description: SHUTTLE_TIMETABLE_DESCRIPTION } : {}),
    requiresSignIn: false,
  };
}

const USEFUL_SERVICES_PAGE = {
  _id: docId("guidePage", "useful-online-services"),
  _type: "guidePage" as const,
  title: { th: "บริการออนไลน์ที่ใช้บ่อย", en: "Useful online services" },
  slug: slug("useful-online-services"),
  summary: {
    th: "ลิงก์ตรงไปยังระบบจอง เครื่องมือแจ้งปัญหา และช่องทางดูแลสุขภาพใจที่นักศึกษาธรรมศาสตร์ท่าพระจันทร์ใช้บ่อยที่สุด",
    en: "Direct links to the booking systems, reporting tools and wellbeing lines Thammasat Tha Prachan students use most often.",
  },
  body: {
    th: [paragraph("แต่ละลิงก์เปิดไปยังระบบของหน่วยงานนั้นโดยตรง ตรวจสอบว่าต้องเข้าสู่ระบบก่อนหรือไม่ก่อนเริ่มใช้งาน")],
    en: [paragraph("Each link opens the organisation's own system. Check whether it needs a sign-in before you start.")],
  },
  category: "welfare" as const,
  relatedLinks: EXTERNAL_SERVICES.map(externalLinkFromService),
  lastReviewed: "2026-08-07",
};

const RULES_AND_DOCUMENTS_PAGE = {
  _id: docId("guidePage", "rules-and-documents"),
  _type: "guidePage" as const,
  title: { th: "ระเบียบและเอกสารอ้างอิง", en: "Rules and reference documents" },
  slug: slug("rules-and-documents"),
  summary: {
    th: "ข้อบังคับและเอกสารอ้างอิงอย่างเป็นทางการของธรรมศาสตร์ท่าพระจันทร์ บางฉบับเผยแพร่เป็นไฟล์ PDF ไฟล์ Drive หรือคู่มือที่สแกนไว้เท่านั้น",
    en: "Official regulations and reference material for Thammasat Tha Prachan. Some are only published as a PDF, a Drive file or a scanned handbook.",
  },
  body: {
    th: [
      paragraph(
        "เอกสารเหล่านี้ยังไม่ได้ถูกเขียนใหม่เป็นเนื้อหาในเว็บไซต์ จึงเปิดเป็นไฟล์ PDF ไฟล์ Drive หรือในกรณีของตารางรถรับส่ง เป็นโพสต์ใน Instagram",
      ),
    ],
    en: [
      paragraph(
        "These have not been rewritten as native page content yet, so they open as PDFs, Drive files or, for the shuttle timetable, an Instagram post.",
      ),
    ],
  },
  category: "governance" as const,
  relatedLinks: SOURCE_DOCUMENTS.map(externalLinkFromDocument),
  lastReviewed: "2026-08-07",
};

/* ------------------------------------------------------------------ *
 * Guide pages: about TUSU and TUSC
 *
 * STUDENT_BODIES.campusReform.note is deliberately left out of both pages
 * below: it is a single English-only sentence with no verified Thai side,
 * and unlike the form sign-in note this script was explicitly told to
 * translate, nothing here asked for an invented Thai version of it. It is
 * printed in the verification summary at the end of the run instead, so an
 * editor can write it properly in both languages.
 * ------------------------------------------------------------------ */

/** `established` is a plain year from the source; converting it to the Buddhist calendar (+543) is arithmetic, not invention. */
function establishedParagraph(establishedYear: number): { th: string; en: string } {
  return {
    en: `Established in ${establishedYear}.`,
    th: `ก่อตั้งขึ้นในปี พ.ศ. ${establishedYear + 543}`,
  };
}

const REGULATION_LINK: ExternalLink = {
  _key: key(),
  label: SOURCE_DOCUMENTS.find((doc) => doc.key === "studentActivityRegulation")?.title ?? STUDENT_BODIES.governedBy,
  url: SOURCE_DOCUMENTS.find((doc) => doc.key === "studentActivityRegulation")?.url ?? "",
};

const ABOUT_TUSU_PAGE = {
  _id: docId("guidePage", "about-tusu"),
  _type: "guidePage" as const,
  title: STUDENT_BODIES.tusu.name,
  slug: slug("about-tusu"),
  summary: {
    th: "องค์การนักศึกษาฝ่ายบริหารประจำธรรมศาสตร์ท่าพระจันทร์ ดูแลงบประมาณ กิจกรรมระดับมหาวิทยาลัย และสวัสดิการนักศึกษา",
    en: "The executive student body at Thammasat Tha Prachan, responsible for budget, university-wide activities and student welfare.",
  },
  body: {
    th: [paragraph(STUDENT_BODIES.tusu.role.th), paragraph(establishedParagraph(STUDENT_BODIES.tusu.established).th)],
    en: [paragraph(STUDENT_BODIES.tusu.role.en), paragraph(establishedParagraph(STUDENT_BODIES.tusu.established).en)],
  },
  category: "governance" as const,
  relatedLinks: [
    REGULATION_LINK,
    {
      _key: key(),
      label: { th: "ลิงก์ทรีของ อมธ. ท่าพระจันทร์", en: "TUSU Tha Prachan Linktree" },
      url: STUDENT_BODIES.tusu.linktree,
    },
  ] satisfies ExternalLink[],
  lastReviewed: "2026-08-07",
};

const ABOUT_TUSC_PAGE = {
  _id: docId("guidePage", "about-tusc"),
  _type: "guidePage" as const,
  title: STUDENT_BODIES.tusc.name,
  slug: slug("about-tusc"),
  summary: {
    th: "ฝ่ายนิติบัญญัติและตรวจสอบประจำธรรมศาสตร์ท่าพระจันทร์ พิจารณาระเบียบกิจกรรมนักศึกษาและตรวจสอบการดำเนินงานขององค์การนักศึกษา",
    en: "The legislative and scrutiny body at Thammasat Tha Prachan, approving student activity rules and scrutinising the Union's work.",
  },
  body: {
    th: [paragraph(STUDENT_BODIES.tusc.role.th), paragraph(establishedParagraph(STUDENT_BODIES.tusc.established).th)],
    en: [paragraph(STUDENT_BODIES.tusc.role.en), paragraph(establishedParagraph(STUDENT_BODIES.tusc.established).en)],
  },
  category: "governance" as const,
  relatedLinks: [
    REGULATION_LINK,
    {
      _key: key(),
      label: { th: "ลิงก์ทรีของสภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Linktree" },
      url: STUDENT_BODIES.tusc.linktree,
    },
    {
      _key: key(),
      label: { th: "Facebook สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Facebook" },
      url: `https://facebook.com/${STUDENT_BODIES.tusc.facebook}`,
    },
    {
      _key: key(),
      label: { th: "Instagram สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Instagram" },
      url: `https://instagram.com/${STUDENT_BODIES.tusc.instagram}`,
    },
    {
      _key: key(),
      label: { th: "อีเมลสภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan email" },
      url: `mailto:${STUDENT_BODIES.tusc.email}`,
    },
  ] satisfies ExternalLink[],
  lastReviewed: "2026-08-16",
};

const GUIDE_PAGE_DOCS = [USEFUL_SERVICES_PAGE, RULES_AND_DOCUMENTS_PAGE, ABOUT_TUSU_PAGE, ABOUT_TUSC_PAGE];

/* ------------------------------------------------------------------ *
 * Shuttle routes
 *
 * Built from SHUTTLE_ROUTES in data/harvested-inventory.ts, which carries
 * the long account of where these times came from and what is still
 * unverified; read that comment before changing anything here.
 *
 * Two honesty decisions made here, both required by CONTRIBUTING.md and
 * spelled out again so they are not missed on a future edit:
 *
 *   1. offsetMinutes. Neither timetable graphic publishes travel time
 *      between stops, only departure times from Thammasat Tha Prachan. Every stop
 *      below is therefore given `offsetMinutes: 0`, the schema's own
 *      documented meaning for "not measured yet" (see
 *      sanity/schemas/objects/shuttleStop.ts: "the first stop... should be
 *      0"). This is not a claim that every stop is reached instantly; it is
 *      the honest absence of a number, made explicit in the route's own
 *      `notes` field below (dormitoryAndOffsetNotes) so nobody mistakes a
 *      placeholder for a measurement.
 *
 *   2. The dormitory-service markers on the Pinklao Line graphic. There is
 *      no field on `shuttleRoute` or `shuttleStop` for a note attached to a
 *      specific departure TIME rather than a specific STOP (checked both
 *      schemas; `shuttleStop.note` is per stop, and `shuttleRoute` has no
 *      per-departure array at all, see sanity/schemas/documents/
 *      shuttleRoute.ts). The route's own `notes` field (LocaleText, "what
 *      a student should know") is the closest real fit and is used for it
 *      below, spelling out exactly which times it applies to. A per-
 *      departure structured field would be a schema change, which is
 *      outside this agent's owned directories.
 * ------------------------------------------------------------------ */

function joinLocaleText(...parts: LocaleText[]): LocaleText {
  return {
    th: parts.map((part) => part.th).filter(Boolean).join(" "),
    en: parts.map((part) => part.en).filter(Boolean).join(" "),
  };
}

/** Groups SHUTTLE_ROUTES' dormitoryDepartures by their shared note text and renders one sentence per group. */
function dormitoryDepartureNote(
  dormitoryDepartures: (typeof SHUTTLE_ROUTES)[number]["dormitoryDepartures"],
): LocaleText | undefined {
  if (!dormitoryDepartures || dormitoryDepartures.length === 0) return undefined;

  const groups = new Map<string, { note: { th: string; en: string }; times: string[] }>();
  for (const departure of dormitoryDepartures) {
    const group = groups.get(departure.note.en) ?? { note: departure.note, times: [] };
    group.times.push(departure.time);
    groups.set(departure.note.en, group);
  }

  const th: string[] = [];
  const en: string[] = [];
  for (const { note, times } of groups.values()) {
    th.push(`รถรอบ ${times.map((time) => `${time} น.`).join(" และ ")} คือ${note.th}`);
    en.push(`The ${times.join(" and ")} departures are the ${note.en.charAt(0).toLowerCase()}${note.en.slice(1)}.`);
  }
  return { th: th.join(" "), en: en.join(" ") };
}

const OFFSET_UNKNOWN_NOTE: LocaleText = {
  th: "เวลาแต่ละจุดจอดยังไม่มีข้อมูลระยะเวลาการเดินทางที่เผยแพร่อย่างเป็นทางการ จึงแสดงเป็นเวลาเดียวกับเวลาออกจากธรรมศาสตร์ท่าพระจันทร์ ไม่ใช่เวลาที่วัดจริง",
  en: "Travel time between stops has not been published, so every stop shows the same time as the departure from Thammasat Tha Prachan, not a measured travel time.",
};

const LAST_BUS_NOTE: LocaleText = {
  th: "รถเที่ยวสุดท้ายออกจากธรรมศาสตร์ท่าพระจันทร์เวลา 21:30 น.",
  en: "The last bus of the day leaves Thammasat Tha Prachan at 21:30.",
};

const TERM_UNKNOWN_NOTE: LocaleText = {
  th: "ตารางนี้ไม่ได้ระบุภาคการศึกษาหรือปีการศึกษาที่ใช้งาน ควรตรวจสอบกับ อมธ. ท่าพระจันทร์ก่อนถือว่าเป็นตารางปัจจุบัน",
  en: "This timetable does not state which term or academic year it applies to. Confirm with TUSU Tha Prachan before treating it as current.",
};

const SHUTTLE_SOURCE_NOTE: LocaleString = {
  th: "ถอดความจากภาพตารางเวลาอย่างเป็นทางการที่ อมธ. ท่าพระจันทร์จัดหาให้ 16 สิงหาคม 2569",
  en: "Transcribed from the official timetable graphic supplied by TUSU Tha Prachan, 16 August 2026.",
};

function buildShuttleStop(stop: (typeof SHUTTLE_ROUTES)[number]["stops"][number]): ShuttleStop {
  return { _key: key(), name: stop.name, offsetMinutes: 0 };
}

function buildShuttleRouteDoc(route: (typeof SHUTTLE_ROUTES)[number]) {
  return {
    _id: docId("shuttleRoute", route.key),
    _type: "shuttleRoute" as const,
    name: route.name,
    slug: slug(slugify(route.name.en)),
    description: route.description,
    stops: route.stops.map(buildShuttleStop),
    calendar: { daysOfWeek: route.daysOfWeek } satisfies ShuttleRoute["calendar"],
    departures: [...route.departures],
    notes: joinLocaleText(
      OFFSET_UNKNOWN_NOTE,
      dormitoryDepartureNote(route.dormitoryDepartures) ?? { th: "", en: "" },
      LAST_BUS_NOTE,
      TERM_UNKNOWN_NOTE,
    ),
    // No realtime feed exists for either route; leave this unset entirely
    // rather than an empty string. See its doc comment in lib/sanity/types.ts.
    isActive: true,
    sourceNote: SHUTTLE_SOURCE_NOTE,
    lastVerified: "2026-08-16",
  } satisfies Omit<ShuttleRoute, "_createdAt" | "_updatedAt">;
}

const SHUTTLE_ROUTE_DOCS = SHUTTLE_ROUTES.map(buildShuttleRouteDoc);

/* ------------------------------------------------------------------ *
 * Site settings
 *
 * The one singleton. Its `_id` must be exactly "siteSettings", because
 * sanity/structure.ts pins the Settings desk item to
 * `S.document().documentId("siteSettings")`: any other id and an editor
 * opening Settings gets an empty form while the real document sits
 * unreachable.
 *
 * `components/layout/site-settings.ts` carries a complete fallback for when
 * this document does not exist, so seeding it is not what makes the site
 * work. What it does is put the chrome under editorial control: until this
 * exists, an editor cannot change the service name, the menu or the help
 * contacts without a developer and a deploy.
 *
 * The help contacts are the real harvested channels rather than the
 * placeholders the fallback ships with. 3.2.6 Consistent Help means these
 * appear in the same place on every page, so a dead link here is a dead end
 * on the entire site.
 * ------------------------------------------------------------------ */

function navItem(th: string, en: string, path: string) {
  return { _key: key(), label: { th, en }, path };
}

const SITE_SETTINGS_DOC = {
  _id: "siteSettings",
  _type: "siteSettings" as const,
  serviceName: { th: "#ท้ายท่าพระจันทร์", en: "#tpclife" },
  tagline: {
    th: "ข้อมูลชีวิตนักศึกษาธรรมศาสตร์ท่าพระจันทร์ ทุกเรื่องในที่เดียว",
    en: "Everything a Thammasat Tha Prachan student needs, in one place",
  },
  /*
   * Alpha, deliberately. The register is new, the timetables carry unverified
   * caveats and the handbook is not yet searchable. Claiming beta or live
   * would be the same kind of dishonesty as labelling a computed departure
   * time "live". An editor moves this on when the content justifies it.
   */
  phase: "alpha" as const,
  phaseNote: {
    th: "นี่คือบริการใหม่ที่ยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    en: "This is a new service still being tested. Some information may be incomplete",
  },
  primaryNav: [
    navItem("แบบฟอร์ม", "Forms", "/forms"),
    navItem("การเดินทาง", "Getting around", "/getting-around"),
    navItem("สวัสดิการนักศึกษา", "Student welfare", "/welfare"),
    navItem("ข่าวสาร", "News", "/news"),
    navItem("กิจกรรม", "Events", "/events"),
    navItem("ของหายและของเก็บได้", "Lost and found", "/lost-and-found"),
    navItem("ความคืบหน้านโยบาย", "Policy progress", "/policy"),
    navItem("ทำเนียบชุมนุมและหน่วยงาน", "Directory", "/directory"),
  ],
  footerNav: [
    navItem("คำถามที่พบบ่อย", "Common questions", "/faq"),
    navItem("เกี่ยวกับ", "About", "/about"),
    navItem("การเข้าถึง", "Accessibility", "/accessibility"),
    navItem("คุกกี้", "Cookies", "/cookies"),
  ],
  helpContacts: [
    {
      _key: key(),
      label: STUDENT_BODIES.tusu.name,
      channel: "url" as const,
      value: STUDENT_BODIES.tusu.linktree,
    },
    {
      _key: key(),
      label: STUDENT_BODIES.tusc.name,
      channel: "url" as const,
      value: STUDENT_BODIES.tusc.linktree,
    },
    {
      // The only channel of the four that reaches a named inbox rather than a
      // link tree, so it is worth listing separately.
      _key: key(),
      label: { th: "อีเมลสภานักศึกษา ท่าพระจันทร์", en: "Email TUSC Tha Prachan" },
      channel: "email" as const,
      value: STUDENT_BODIES.tusc.email,
    },
  ],
  organisationLinks: [
    {
      _key: key(),
      label: { th: "อมธ. ท่าพระจันทร์ บน Instagram", en: "TUSU Tha Prachan on Instagram" },
      url: `https://www.instagram.com/${STUDENT_BODIES.tusu.instagram}/`,
    },
    {
      _key: key(),
      label: { th: "สภานักศึกษา ท่าพระจันทร์ บน Instagram", en: "TUSC Tha Prachan on Instagram" },
      url: `https://www.instagram.com/${STUDENT_BODIES.tusc.instagram}/`,
    },
    {
      _key: key(),
      label: { th: "สภานักศึกษา ท่าพระจันทร์ บน Facebook", en: "TUSC Tha Prachan on Facebook" },
      url: `https://www.facebook.com/${STUDENT_BODIES.tusc.facebook}/`,
    },
  ],
};

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

// Each doc only needs `_id` and `_type` to satisfy IdentifiedSanityDocumentStub;
// the rest is whatever shape that document's builder produced above.
type SeedDoc = { _id: string; _type: string } & Record<string, unknown>;

async function seedAll(): Promise<void> {
  const docs: SeedDoc[] = [
    SITE_SETTINGS_DOC,
    ...ORGANISATION_DOCS,
    ...FORM_DOCS,
    ...GUIDE_PAGE_DOCS,
    ...SHUTTLE_ROUTE_DOCS,
  ];

  let succeeded = 0;
  const failures: Array<{ id: string; error: unknown }> = [];

  for (const doc of docs) {
    try {
      await client.createOrReplace(doc);
      succeeded += 1;
      console.log(`  ok    ${doc._id}`);
    } catch (error) {
      failures.push({ id: doc._id, error });
      console.error(`  fail  ${doc._id}`);
    }
  }

  console.log(`\n${succeeded}/${docs.length} documents written.`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} document(s) failed:`);
    for (const failure of failures) {
      console.error(`  ${failure.id}: ${failure.error instanceof Error ? failure.error.message : String(failure.error)}`);
    }
  }

  console.log(
    "\nStill needs a human, not fully resolved by this run:\n" +
      `  - form.emergencyReport: ${FORMS.find((f) => f.key === "emergencyReport")?.needsVerification ?? ""}\n` +
      `  - form.equipmentRequest: ${FORMS.find((f) => f.key === "equipmentRequest")?.needsVerification ?? ""}\n` +
      `  - external service tuWellBeing / wellbeingCenter: ${
        EXTERNAL_SERVICES.find((s) => s.key === "tuWellBeing")?.needsVerification ?? ""
      }\n` +
      `  - shuttle: ${TRANSPORT.shuttle.needsVerification}\n` +
      "  - shuttleRoute-sanamChai and shuttleRoute-pinklao: every stop's offsetMinutes is 0, a placeholder, " +
      "because neither timetable graphic publishes travel time between stops. Time the routes by hand and update " +
      "each stop. Also, the term or academic year both timetables apply to is unknown; confirm with TUSU before " +
      "relying on them past the current term. Both caveats are also written into each route's own `notes` field.\n" +
      `  - bus routes: ${TRANSPORT.needsVerification}\n` +
      `  - faculty name spelling: ${FACULTY_NAME_SPELLING_NOTE}\n` +
      `  - TUSU/TUSC campus reform note (English only, not seeded): ${STUDENT_BODIES.campusReform.note}\n`,
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

seedAll().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
