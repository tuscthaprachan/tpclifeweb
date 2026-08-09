import { defineArrayMember, defineField, defineType } from "sanity";

import { CATEGORY_OPTIONS, OWNER_OPTIONS } from "../constants";
import { bilingualBlockMessageOptional, bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

const DESTINATION_TYPES = [
  { title: "Google Form", value: "googleForm" },
  { title: "External website", value: "externalSite" },
  { title: "Email", value: "email" },
  { title: "In person", value: "inPerson" },
  { title: "LINE", value: "line" },
];

const NEEDS_URL = new Set(["googleForm", "externalSite"]);

/**
 * A record of a form a student might need. Sanity holds a rich description
 * of the form so a student learns what they need BEFORE they click.
 * Submission still happens on the owner's own system, this record does not
 * collect anything itself.
 */
export const form = defineType({
  name: "form",
  title: "Form",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "signIn", title: "Sign-in" },
    { name: "destination", title: "Destination" },
    { name: "status", title: "Status" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      group: "content",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: (doc: Record<string, unknown>) => (doc.title as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "purpose",
      title: "Purpose",
      type: "localeString",
      group: "content",
      description: "One sentence. What this form is for, written the way a student would explain it.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeBlock",
      group: "content",
      description: "Optional. Longer detail if one sentence is not enough.",
      validation: (rule) => rule.custom(bilingualBlockMessageOptional),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      group: "content",
      options: { list: CATEGORY_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "string",
      group: "content",
      description: "Which body runs this form. Every governance item must be attributed to someone.",
      options: { list: OWNER_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "audience",
      title: "Audience",
      type: "localeText",
      group: "content",
      description: "Optional. Who this form is for, rendered as a quick check the student is in the right place.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "prerequisites",
      title: "Prerequisites",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "formPrerequisite" })],
      description: "Optional. What to have ready before starting, shown as a checklist.",
    }),
    defineField({
      name: "requiresSignIn",
      title: "Requires sign-in",
      type: "boolean",
      group: "signIn",
      initialValue: false,
      description:
        "Whether the destination demands a sign-in the student may not have. For example, the TPC emergency report form returns an error to anyone not signed in with a Google account. Telling a student this before they click is one of the most useful things this site can do, so check this carefully rather than leaving the default.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "signInType",
      title: "Sign-in type",
      type: "string",
      group: "signIn",
      description: "Which account is needed.",
      options: {
        list: [
          { title: "Google account", value: "google" },
          { title: "TU account", value: "tuAccount" },
          { title: "Other", value: "other" },
        ],
      },
      hidden: ({ parent }: { parent?: { requiresSignIn?: boolean } }) => !parent?.requiresSignIn,
    }),
    defineField({
      name: "signInNote",
      title: "Sign-in note",
      type: "localeString",
      group: "signIn",
      description: "Optional. Anything extra a student needs to know about signing in.",
      hidden: ({ parent }: { parent?: { requiresSignIn?: boolean } }) => !parent?.requiresSignIn,
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "destinationType",
      title: "Destination type",
      type: "string",
      group: "destination",
      options: { list: DESTINATION_TYPES },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "destinationUrl",
      title: "Destination URL",
      type: "url",
      group: "destination",
      description:
        "Required for a Google Form or an external website. Where the student actually goes to submit this.",
      validation: (rule) =>
        rule
          .uri({ scheme: ["http", "https"] })
          .custom((value: string | undefined, context) => {
            const parent = context.parent as { destinationType?: string } | undefined;
            if (parent?.destinationType && NEEDS_URL.has(parent.destinationType) && !value) {
              return "Add the destination link. A Google Form or external website needs somewhere to send the student.";
            }
            return true;
          }),
    }),
    defineField({
      name: "estimatedMinutes",
      title: "Estimated minutes",
      type: "number",
      group: "destination",
      description: "Optional. Realistic, in minutes. Do not flatter the form by underestimating it.",
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: "turnaround",
      title: "Turnaround",
      type: "localeString",
      group: "destination",
      description: "Optional. What happens next and how long it takes.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "deadline",
      title: "Deadline",
      type: "date",
      group: "destination",
      description: "Optional. Only set this if the form has a real closing date.",
    }),
    defineField({
      name: "contact",
      title: "Contact",
      type: "helpContact",
      group: "destination",
      description: "Optional. Who to ask if a student gets stuck partway through.",
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      group: "status",
      initialValue: true,
      description: "Turn this off if the form is discontinued or being replaced, rather than deleting the record.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "isPriority",
      title: "Priority",
      type: "boolean",
      group: "status",
      initialValue: false,
      description: "Turn this on to surface this form on the home page and rank it above other search results.",
    }),
    defineField({
      name: "lastVerified",
      title: "Last verified",
      type: "date",
      group: "status",
      description: "The date someone last checked this form's link and requirements are still correct.",
    }),
  ],
  preview: {
    select: {
      title: "title.en",
      requiresSignIn: "requiresSignIn",
      isActive: "isActive",
    },
    prepare({
      title,
      requiresSignIn,
      isActive,
    }: {
      title?: string;
      requiresSignIn?: boolean;
      isActive?: boolean;
    }) {
      return {
        title: title || "Untitled form",
        subtitle: [
          requiresSignIn ? "Sign-in required" : "No sign-in",
          isActive === false ? "Not active" : undefined,
        ]
          .filter(Boolean)
          .join(", "),
      };
    },
  },
});
