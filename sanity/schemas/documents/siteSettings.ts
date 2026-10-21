import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/**
 * Sitewide settings. There is exactly one of these documents, opened
 * directly from the "Settings" item in the desk structure rather than
 * through a list, so there is no "create new" or "duplicate" for it.
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  groups: [
    { name: "identity", title: "Identity", default: true },
    { name: "navigation", title: "Navigation" },
    { name: "help", title: "Help and links" },
  ],
  fields: [
    defineField({
      name: "serviceName",
      title: "Service name",
      type: "localeString",
      group: "identity",
      description: 'The site name as shown in the header, in Thai and English, for example "TryTPC".',
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "localeString",
      group: "identity",
      description: "A short line under the site name saying what it is.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "phase",
      title: "Phase",
      type: "string",
      group: "identity",
      description:
        'An honest statement of how finished this site is, shown in the phase banner. "Live" is a promise that everything on the site actually works, so only use it once it is true.',
      options: {
        list: [
          { title: "Alpha", value: "alpha" },
          { title: "Beta", value: "beta" },
          { title: "Live", value: "live" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "phaseNote",
      title: "Phase note",
      type: "localeString",
      group: "identity",
      description: "Optional. Shown next to the phase tag. Say plainly what is still missing or being worked on.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "primaryNav",
      title: "Primary navigation",
      type: "array",
      group: "navigation",
      of: [defineArrayMember({ type: "navItem" })],
      description: "The main menu shown in the header.",
      validation: (rule) => rule.required().min(1).error("Add at least one navigation item."),
    }),
    defineField({
      name: "footerNav",
      title: "Footer navigation",
      type: "array",
      group: "navigation",
      of: [defineArrayMember({ type: "navItem" })],
      description: "The links shown in the footer.",
      validation: (rule) => rule.required().min(1).error("Add at least one footer link."),
    }),
    defineField({
      name: "helpContacts",
      title: "Help contacts",
      type: "array",
      group: "help",
      of: [defineArrayMember({ type: "helpContact" })],
      description:
        "Shown in the help block that appears in the same place on every page. Add every real way a student can reach a human.",
      validation: (rule) => rule.required().min(1).error("Add at least one help contact."),
    }),
    defineField({
      name: "organisationLinks",
      title: "Organisation links",
      type: "array",
      group: "help",
      of: [defineArrayMember({ type: "externalLink" })],
      description: "Optional. Links to TUSU, TUSC or other official pages, shown wherever the site lists them.",
    }),
  ],
  preview: {
    select: { title: "serviceName.en", subtitle: "phase" },
    prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
      return { title: title || "Site settings", subtitle };
    },
  },
});
