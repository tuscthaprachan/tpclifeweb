import { defineArrayMember, defineField, defineType } from "sanity";

import { OWNER_OPTIONS } from "../constants";
import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/**
 * Lost and found. Registered as schema name `lostFoundItem`, matching
 * `_type: "lostFoundItem"` on `LostFoundItem` in `lib/sanity/types.ts`. Read
 * that type's doc comments (HONESTY, PRIVACY) before changing anything here,
 * they are requirements, not commentary.
 *
 * Two fields on this document deliberately have NO counterpart in
 * `LostFoundItem`: `submitterContact` and `staffVerificationDetail`, both
 * added below, next to the fields the public type contract does describe.
 * Both exist only so the public report form (app/[locale]/lost-and-found/report)
 * has somewhere internal to put information that must never reach a public
 * page: the reporter's own contact detail, and the one identifying feature
 * an editor holds back so a claim can be checked against it. Every query the
 * frontend reads through (lib/sanity/queries.ts) projects with `...`, so
 * both fields ARE present in the raw GROQ result, but no page ever reads
 * them by name, and their Studio descriptions say to clear them before
 * publishing. `structure.ts`'s "Waiting for approval" queue is where that
 * clearing happens, before an editor hits Publish.
 */

const KIND_OPTIONS = [
  { title: "Lost (a student is looking for this)", value: "lost" },
  { title: "Found (someone handed this in)", value: "found" },
];

const STATUS_OPTIONS = [
  { title: "Open", value: "open" },
  { title: "Matched (a possible owner is being checked)", value: "matched" },
  { title: "Returned", value: "returned" },
  { title: "Unclaimed (claim window passed)", value: "unclaimed" },
  { title: "Withdrawn", value: "withdrawn" },
];

/** Matches the `LostFoundCategory` union in `lib/sanity/types.ts` exactly. */
const CATEGORY_OPTIONS = [
  { title: "Student or ID card", value: "idCard" },
  { title: "Bank card", value: "bankCard" },
  { title: "Keys", value: "keys" },
  { title: "Wallet or purse", value: "wallet" },
  { title: "Phone", value: "phone" },
  { title: "Laptop or tablet", value: "laptop" },
  { title: "Bag", value: "bag" },
  { title: "Clothing", value: "clothing" },
  { title: "Book", value: "book" },
  { title: "Stationery", value: "stationery" },
  { title: "Jewellery or watch", value: "jewellery" },
  { title: "Glasses", value: "eyewear" },
  { title: "Umbrella", value: "umbrella" },
  { title: "Water bottle", value: "waterBottle" },
  { title: "Other", value: "other" },
];

export const lostFoundItem = defineType({
  name: "lostFoundItem",
  title: "Lost and found item",
  type: "document",
  fields: [
    defineField({
      name: "reference",
      title: "Reference",
      type: "string",
      description:
        'The short code a student quotes at the desk, for example "LF-2026-0184". Allocated automatically, either by the public report form or by whatever process creates this entry. Never type one in by hand: a hand-typed code can collide with one already issued.',
      readOnly: true,
      validation: (rule) =>
        rule
          .required()
          .regex(/^LF-\d{4}-\d{4}$/, { name: "reference format" })
          .error('Must look like "LF-2026-0184": the letters LF, a dash, a four digit year, a dash, and a four digit number.')
          .custom(async (value: string | undefined, context) => {
            if (!value) return true;
            const client = context.getClient({ apiVersion: "2025-02-19" });
            const id = (context.document?._id ?? "").replace(/^drafts\./, "");
            const duplicateId = await client.fetch<string | null>(
              `*[_type == "lostFoundItem" && reference == $reference && !(_id in [$draftId, $publishedId])][0]._id`,
              { reference: value, draftId: `drafts.${id}`, publishedId: id },
            );
            return duplicateId ? "This reference is already used by another entry." : true;
          }),
    }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      description: "Which half of the register this belongs to.",
      options: { list: KIND_OPTIONS, layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      description: "A short name for the item, for example \"Black umbrella\" or \"TU student card\".",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: (doc: Record<string, unknown>) => (doc.title as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeText",
      description:
        "What the item is, in enough detail to recognise but not enough for a false claim to succeed. Hold back one identifying detail (a scratch, an inscription, something inside a bag) and put that in \"Detail for staff\" below instead of here, so a claim can be checked against it.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: { list: CATEGORY_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "photos",
      title: "Photos",
      type: "array",
      of: [defineArrayMember({ type: "siteImage" })],
      description:
        "Optional. Photograph the item itself, never a person, and never the readable face of an ID or bank card. Alt text is required on each image unless it is marked decorative.",
    }),
    defineField({
      name: "place",
      title: "Place",
      type: "reference",
      to: [{ type: "place" }],
      description: "Where it was lost or found, when it is a place the site already knows. Leave empty and use the note below for anywhere else, including off campus.",
    }),
    defineField({
      name: "locationNote",
      title: "Location note",
      type: "localeString",
      description: "Free text location for anywhere \"Place\" above does not cover. At least one of Place or this note is required.",
      validation: (rule) =>
        rule.custom((value: Record<string, unknown> | undefined, context) => {
          const bilingual = bilingualStringMessageOptional(value);
          if (bilingual !== true) return bilingual;
          const parent = context.parent as { place?: unknown } | undefined;
          const th = typeof value?.th === "string" ? value.th.trim() : "";
          const en = typeof value?.en === "string" ? value.en.trim() : "";
          if (!parent?.place && !th && !en) {
            return 'Add a "Place" above, or a location note here. At least one is required.';
          }
          return true;
        }),
    }),
    defineField({
      name: "occurredOn",
      title: "Date",
      type: "date",
      description: "The Asia/Bangkok calendar date it was lost or found.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      description: "Set by hand. This register never infers a status from dates or activity, only from what an editor recorded.",
      options: { list: STATUS_OPTIONS },
      initialValue: "open",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heldAt",
      title: "Held at",
      type: "localeString",
      description: 'Found items only. Where the item physically is and who is holding it, in words a student can act on, for example "TUSC office, room W101".',
      hidden: ({ parent }: { parent?: { kind?: string } }) => parent?.kind !== "found",
      validation: (rule) =>
        rule.custom((value: Record<string, unknown> | undefined, context) => {
          const parent = context.parent as { kind?: string } | undefined;
          if (parent?.kind === "lost") {
            const th = typeof value?.th === "string" ? value.th.trim() : "";
            const en = typeof value?.en === "string" ? value.en.trim() : "";
            if (th || en) return "A lost item has no holding location. Clear this field, or check the kind above.";
            return true;
          }
          return bilingualStringMessageOptional(value);
        }),
    }),
    defineField({
      name: "claimBy",
      title: "Collect by",
      type: "date",
      description: "Found items only. The date after which the holder stops keeping it. Drives the \"unclaimed\" status once passed, but only when an editor sets that status by hand.",
      hidden: ({ parent }: { parent?: { kind?: string } }) => parent?.kind !== "found",
      validation: (rule) =>
        rule.custom((value: string | undefined, context) => {
          const parent = context.parent as { kind?: string } | undefined;
          if (parent?.kind === "lost" && value) {
            return "A lost item has no collection deadline. Clear this field, or check the kind above.";
          }
          return true;
        }),
    }),
    defineField({
      name: "claimContact",
      title: "Claim contact",
      type: "helpContact",
      description: "Optional. How a student starts a claim, if it is different from the desk named in \"Held at\" above.",
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "string",
      description: "Which body runs this entry. Every entry is attributable, the same rule as every other governance item on this site.",
      options: { list: OWNER_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "resolvedAt",
      title: "Resolved at",
      type: "datetime",
      description: 'Optional. When it reached "Returned" or "Unclaimed". Set this by hand at the same time as the status above, never inferred.',
    }),
    defineField({
      name: "submittedByStudent",
      title: "Submitted by a student",
      type: "boolean",
      initialValue: false,
      description: "Set automatically when this entry arrived through the public report form. Records provenance only, it does not control whether this entry is visible: an unpublished draft is invisible regardless of this flag.",
      readOnly: true,
    }),
    defineField({
      name: "submitterContact",
      title: "Reporter contact (internal only)",
      type: "string",
      description:
        "INTERNAL ONLY. The reporter's own contact detail, collected so staff can follow up on their report. This has no place in the public LostFoundItem shape and must never be published: clear this field before you hit Publish. If you need to keep a record of it, do that off this website.",
    }),
    defineField({
      name: "staffVerificationDetail",
      title: "Detail for staff (internal only)",
      type: "text",
      rows: 2,
      description:
        "INTERNAL ONLY. The one identifying detail held back from the public description, used to check a claim against. This has no place in the public LostFoundItem shape and must never be published: clear this field before you hit Publish, or move anything worth keeping into your own notes.",
    }),
  ],
  preview: {
    select: { kind: "kind", reference: "reference", title: "title.en", status: "status" },
    prepare({ kind, reference, title, status }: { kind?: string; reference?: string; title?: string; status?: string }) {
      const kindWord = kind === "found" ? "Found" : kind === "lost" ? "Lost" : "?";
      return {
        title: `[${kindWord}] ${title || "Untitled"}`,
        subtitle: [reference, status].filter(Boolean).join(" · "),
      };
    },
  },
});
