import { defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

const STATUS_OPTIONS = [
  { title: "Not started", value: "notStarted" },
  { title: "In progress", value: "inProgress" },
  { title: "Delivered", value: "delivered" },
  { title: "Blocked", value: "blocked" },
  { title: "Dropped", value: "dropped" },
];

/**
 * One entry in a policy's timeline. Each entry records the status as of that
 * date, so the history reads correctly on its own even without the current
 * status field at the top of the policy.
 */
export const policyUpdate = defineType({
  name: "policyUpdate",
  title: "Update",
  type: "object",
  fields: [
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "localeText",
      description: "What happened, in plain language, in Thai and English.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "status",
      title: "Status as of this update",
      type: "string",
      options: { list: STATUS_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "localeString",
      description: "Optional. Who wrote this update, for example a committee name.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "evidenceUrl",
      title: "Evidence link",
      type: "url",
      description: "Optional. A link to the minutes, report or document this update is based on.",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
  ],
  preview: {
    select: { title: "note.en", date: "date", status: "status" },
    prepare({ title, date, status }: { title?: string; date?: string; status?: string }) {
      return {
        title: title || "Untitled update",
        subtitle: [date, status].filter(Boolean).join(", "),
      };
    },
  },
});
