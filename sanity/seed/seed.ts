/**
 * Seeds Sanity with the real content already researched in
 * data/harvested-inventory.ts. This is a starting point for editors, not a
 * replacement for them: see the header of that file for where each fact came
 * from and what still needs a human to confirm it.
 *
 * WHAT THIS CREATES
 *   - `organisation` documents for the 23 real organisations in ORGANISATIONS.
 *   - `form` documents for the 2 real forms in FORMS. Both require Google
 *     sign-in; the emergency report form's 401-to-anonymous-requests finding
 *     is carried into its `signInNote`, translated into both languages.
 *   - Two `guidePage` documents that collect EXTERNAL_SERVICES and
 *     SOURCE_DOCUMENTS as `relatedLinks`. Neither set belongs to a page that
 *     exists yet, so a guide page is the honest home for them (see the
 *     comment above GUIDE_PAGES below for why relatedLinks was chosen over
 *     rewriting each source as page content).
 *   - Two `guidePage` documents, "about-tusu" and "about-tusc", built from
 *     STUDENT_BODIES.
 *
 * WHAT THIS DELIBERATELY DOES NOT CREATE
 *   - Any `shuttleRoute` or shuttle timetable. TRANSPORT.shuttle in
 *     data/harvested-inventory.ts carries a `needsVerification` note because
 *     the only published timetable is an image in an Instagram post, not
 *     structured data. Inventing departure times would be worse than
 *     showing none, so this script does not touch `shuttleRoute` at all.
 *   - A published `form.equipmentRequest`. Its `destinationUrl` was never
 *     captured (see FORMS[1].needsVerification), and `form` schema
 *     validation requires a URL for a Google Form. Publishing a form with a
 *     dead or missing link would be worse than not listing it, so this
 *     script writes it as a Sanity DRAFT (`drafts.form.equipmentRequest`):
 *     it exists for an editor to find and finish in the Studio, but the
 *     published dataset the site reads from (`lib/sanity/client.ts` fetches
 *     with `perspective: "published"`) never sees it.
 *
 * Every `needsVerification` note that is not carried into a document (the
 * equipment form's missing link, the shuttle timetable, the unconfirmed bus
 * route numbers) is printed to the console at the end of the run instead, so
 * running this script surfaces exactly what still needs a human, rather than
 * silently dropping it.
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
 *   deterministic `_id` (for example `organisation.basictpc`), so running
 *   this script again updates the same documents instead of duplicating
 *   them.
 */

import { randomUUID } from "node:crypto";

import { createClient } from "@sanity/client";

import {
  EXTERNAL_SERVICES,
  FORMS,
  ORGANISATIONS,
  SOURCE_DOCUMENTS,
  STUDENT_BODIES,
  TRANSPORT,
} from "../../data/harvested-inventory";
import type { LocaleString } from "../../lib/i18n/config";
import { apiVersion, dataset, projectId } from "../../lib/sanity/env";
import type {
  ExternalLink,
  FormRecord,
  Organisation,
  OrganisationContact,
  OrganisationType,
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
    _id: `organisation.${org.handle}`,
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

  return {
    // The equipment request form is missing a real destinationUrl (see the
    // header comment), so it is written as a draft: everything else about
    // it is genuine, but it is not honest to publish a "start now" link that
    // does not exist yet.
    _id: isEmergencyReport ? `form.${form.key}` : `drafts.form.${form.key}`,
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
    ...("destinationUrl" in form ? { destinationUrl: form.destinationUrl } : {}),
    isActive: true,
    isPriority: form.isPriority,
    ...(isEmergencyReport ? { lastVerified: "2026-08-07" } : {}),
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
  _id: "guidePage.useful-online-services",
  _type: "guidePage" as const,
  title: { th: "บริการออนไลน์ที่ใช้บ่อย", en: "Useful online services" },
  slug: slug("useful-online-services"),
  summary: {
    th: "ลิงก์ตรงไปยังระบบจอง เครื่องมือแจ้งปัญหา และช่องทางดูแลสุขภาพใจที่นักศึกษาท่าพระจันทร์ใช้บ่อยที่สุด",
    en: "Direct links to the booking systems, reporting tools and wellbeing lines Tha Prachan students use most often.",
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
  _id: "guidePage.rules-and-documents",
  _type: "guidePage" as const,
  title: { th: "ระเบียบและเอกสารอ้างอิง", en: "Rules and reference documents" },
  slug: slug("rules-and-documents"),
  summary: {
    th: "ข้อบังคับและเอกสารอ้างอิงอย่างเป็นทางการของท่าพระจันทร์ บางฉบับเผยแพร่เป็นไฟล์ PDF ไฟล์ Drive หรือคู่มือที่สแกนไว้เท่านั้น",
    en: "Official regulations and reference material for Tha Prachan. Some are only published as a PDF, a Drive file or a scanned handbook.",
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
  _id: "guidePage.about-tusu",
  _type: "guidePage" as const,
  title: STUDENT_BODIES.tusu.name,
  slug: slug("about-tusu"),
  summary: {
    th: "องค์การนักศึกษาฝ่ายบริหารประจำท่าพระจันทร์ ดูแลงบประมาณ กิจกรรมระดับมหาวิทยาลัย และสวัสดิการนักศึกษา",
    en: "The executive student body at Tha Prachan, responsible for budget, university-wide activities and student welfare.",
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
  _id: "guidePage.about-tusc",
  _type: "guidePage" as const,
  title: STUDENT_BODIES.tusc.name,
  slug: slug("about-tusc"),
  summary: {
    th: "ฝ่ายนิติบัญญัติและตรวจสอบประจำท่าพระจันทร์ พิจารณาระเบียบกิจกรรมนักศึกษาและตรวจสอบการดำเนินงานขององค์การนักศึกษา",
    en: "The legislative and scrutiny body at Tha Prachan, approving student activity rules and scrutinising the Union's work.",
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
  ] satisfies ExternalLink[],
  lastReviewed: "2026-08-07",
};

const GUIDE_PAGE_DOCS = [USEFUL_SERVICES_PAGE, RULES_AND_DOCUMENTS_PAGE, ABOUT_TUSU_PAGE, ABOUT_TUSC_PAGE];

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

// Each doc only needs `_id` and `_type` to satisfy IdentifiedSanityDocumentStub;
// the rest is whatever shape that document's builder produced above.
type SeedDoc = { _id: string; _type: string } & Record<string, unknown>;

async function seedAll(): Promise<void> {
  const docs: SeedDoc[] = [...ORGANISATION_DOCS, ...FORM_DOCS, ...GUIDE_PAGE_DOCS];

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
    "\nStill needs a human, not written to any document:\n" +
      "  - form.equipmentRequest: destinationUrl was never captured. " +
      `${FORMS.find((f) => f.key === "equipmentRequest")?.needsVerification ?? ""} ` +
      "Seeded as a draft, not published.\n" +
      `  - shuttle: ${TRANSPORT.shuttle.needsVerification}\n` +
      `  - bus routes: ${TRANSPORT.needsVerification}\n` +
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
