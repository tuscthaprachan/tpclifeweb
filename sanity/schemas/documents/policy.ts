import { defineArrayMember, defineField, defineType } from "sanity";

import { OWNER_OPTIONS } from "../constants";
import { bilingualBlockMessageOptional, bilingualStringMessage } from "../objects/locale";

const STATUS_OPTIONS = [
  { title: "Not started", value: "notStarted" },
  { title: "In progress", value: "inProgress" },
  { title: "Delivered", value: "delivered" },
  { title: "Blocked", value: "blocked" },
  { title: "Dropped", value: "dropped" },
];

/**
 * A policy tracker entry, combined across TUSU and TUSC but always
 * attributed to whichever one owns it. A TUSC entry is often scrutiny of a
 * TUSU entry, which `oversightOf` records rather than flattening away.
 */
export const policy = defineType({
  name: "policy",
  title: "Policy",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
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
      name: "summary",
      title: "Summary",
      type: "localeText",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "detail",
      title: "Detail",
      type: "localeBlock",
      description: "Optional. Full background and context.",
      validation: (rule) => rule.custom(bilingualBlockMessageOptional),
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "string",
      description: "Which body owns this policy. Every governance item must be attributed to someone.",
      options: { list: OWNER_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "policyArea",
      title: "Policy area",
      type: "localeString",
      description: 'The general subject, for example "Vehicle access" or "Student welfare budget".',
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: STATUS_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "progressPercent",
      title: "Progress percent",
      type: "number",
      description:
        "Optional. This renders only when you set it by hand. It never gets calculated from the status, the dates, or the number of updates below, so leave this blank rather than guess a number. A made-up figure on a progress bar is a claim nobody actually made.",
      validation: (rule) => rule.min(0).max(100).integer(),
    }),
    defineField({
      name: "startedAt",
      title: "Started",
      type: "date",
      description: "Optional.",
    }),
    defineField({
      name: "targetDate",
      title: "Target date",
      type: "date",
      description: "Optional.",
    }),
    defineField({
      name: "completedAt",
      title: "Completed",
      type: "date",
      description: "Optional.",
    }),
    defineField({
      name: "oversightOf",
      title: "Oversight of",
      type: "reference",
      to: [{ type: "policy" }],
      description: "Optional. The TUSU policy this TUSC entry scrutinises, where that applies.",
      options: {
        filter: ({ document }: { document: Record<string, unknown> }) => {
          const rawId = typeof document._id === "string" ? document._id : "";
          const id = rawId.replace(/^drafts\./, "");
          return {
            filter: "_id != $id && _id != $draftId",
            params: { id, draftId: `drafts.${id}` },
          };
        },
      },
    }),
    defineField({
      name: "updates",
      title: "Updates",
      type: "array",
      of: [defineArrayMember({ type: "policyUpdate" })],
      description: "Optional. A dated history of this policy, newest and oldest both kept for the record.",
    }),
    defineField({
      name: "evidenceLinks",
      title: "Evidence links",
      type: "array",
      of: [defineArrayMember({ type: "externalLink" })],
      description: "Optional. Links to the minutes, reports or documents this entry is based on.",
    }),
  ],
  preview: {
    select: { title: "title.en", owner: "owner", status: "status" },
    prepare({ title, owner, status }) {
      return {
        title: (title as string | undefined) || "Untitled policy",
        subtitle: [owner, status].filter(Boolean).join(", "),
      };
    },
  },
});
