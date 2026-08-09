import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage } from "../objects/locale";

/**
 * A short-lived notice shown on the shuttle panel, the home page, or
 * sitewide. Alerts expire on their own: a stale alert left up after the
 * problem is fixed is worse than showing nothing.
 */
export const serviceAlert = defineType({
  name: "serviceAlert",
  title: "Service alert",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      description: "Short and specific, in Thai and English, for example \"Shuttle delayed today\".",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "localeText",
      description: "What is happening and what a student should do about it, in Thai and English.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "severity",
      title: "Severity",
      type: "string",
      initialValue: "info",
      description:
        "How serious this is. This drives the icon and colour shown with the alert, on top of the word itself, never colour alone.",
      options: {
        list: [
          { title: "Information", value: "info" },
          { title: "Warning", value: "warning" },
          { title: "Critical", value: "critical" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "affects",
      title: "Affects",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: {
        list: [
          { title: "Shuttle", value: "shuttle" },
          { title: "Campus", value: "campus" },
          { title: "Forms", value: "forms" },
          { title: "Sitewide", value: "sitewide" },
        ],
      },
      description: "Which parts of the site show this alert. Leave empty to show it everywhere.",
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      description: "When this alert starts showing, in Bangkok time.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends at",
      type: "datetime",
      description:
        "When this alert stops showing, in Bangkok time. Set a real end time whenever you can, so it disappears on its own instead of relying on someone remembering to remove it.",
      validation: (rule) =>
        rule.custom((value: string | undefined, context) => {
          if (!value) return true;
          const parent = context.parent as { startsAt?: string } | undefined;
          if (parent?.startsAt && new Date(value).getTime() <= new Date(parent.startsAt).getTime()) {
            return "The end time must be after the start time.";
          }
          return true;
        }),
    }),
    defineField({
      name: "moreInfoUrl",
      title: "More information link",
      type: "url",
      description: "Optional. A link to more detail, if there is somewhere to send a student.",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
  ],
  preview: {
    select: { title: "title.en", severity: "severity", startsAt: "startsAt" },
    prepare({ title, severity, startsAt }: { title?: string; severity?: string; startsAt?: string }) {
      return {
        title: title || "Untitled alert",
        subtitle: [severity, startsAt ? new Date(startsAt).toLocaleString("en-GB") : undefined]
          .filter(Boolean)
          .join(", "),
      };
    },
  },
});
