import { defineArrayMember, defineField, defineType } from "sanity";

import { helpContactFields } from "./helpContact";
import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

/**
 * Rich text building blocks, shared by every `localeBlock` field (news
 * bodies, event bodies, policy detail, page bodies, FAQ answers).
 *
 * Block styles are deliberately limited to h2 to h4, normal text,
 * blockquote and lists. There is no h1: the page itself owns the one and
 * only h1, an editor writing body copy should never be able to add a
 * second one.
 */

const BLOCK_STYLES = [
  { title: "Normal", value: "normal" },
  { title: "Heading 2", value: "h2" },
  { title: "Heading 3", value: "h3" },
  { title: "Heading 4", value: "h4" },
  { title: "Quote", value: "blockquote" },
];

const BLOCK_LISTS = [
  { title: "Bulleted list", value: "bullet" },
  { title: "Numbered list", value: "number" },
];

const BLOCK_DECORATORS = [
  { title: "Bold", value: "strong" },
  { title: "Italic", value: "em" },
];

/**
 * A live form dropped into body text. Renders with that form's current
 * title, requirements and sign-in warning, pulled fresh at read time, so it
 * never goes stale the way a hand-typed summary of a form would.
 */
export const formCallout = defineType({
  name: "formCallout",
  title: "Form callout",
  type: "object",
  icon: () => "📝",
  fields: [
    defineField({
      name: "form",
      title: "Form",
      type: "reference",
      to: [{ type: "form" }],
      options: { filter: "isActive == true" },
      description: "The form to show here. Its title, requirements and sign-in warning are shown automatically.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "form.title.en", subtitle: "form.title.th" },
    prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
      return { title: title || subtitle || "Form callout" };
    },
  },
});

/**
 * A single labelled outbound link, set apart from the surrounding
 * paragraph so it reads as a clear next step rather than buried in a
 * sentence.
 */
export const linkOut = defineType({
  name: "linkOut",
  title: "Link out",
  type: "object",
  icon: () => "🔗",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "localeString",
      description: "The link text, in Thai and English. Say where it goes, not just \"click here\".",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeString",
      description: "Optional. One short line about what the student finds there.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "requiresSignIn",
      title: "Requires sign-in",
      type: "boolean",
      initialValue: false,
      description: "Turn this on if the destination needs an account the student may not have.",
    }),
  ],
  preview: {
    select: { title: "label.en", subtitle: "url" },
  },
});

/**
 * A highlighted note set apart from the surrounding text: a warning, a
 * point worth stressing, or a plain aside. Every tone renders with an icon
 * and a word, never colour alone (1.4.1 Use of Colour).
 */
export const calloutBox = defineType({
  name: "calloutBox",
  title: "Callout box",
  type: "object",
  icon: () => "💬",
  fields: [
    defineField({
      name: "tone",
      title: "Tone",
      type: "string",
      initialValue: "info",
      options: {
        list: [
          { title: "Information", value: "info" },
          { title: "Warning", value: "warning" },
          { title: "Critical", value: "critical" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      description: "Optional. A short heading for the box.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "localeText",
      description: "The note itself, in Thai and English. Keep it short, this is not a place for a full paragraph.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
  ],
  preview: {
    select: { title: "title.en", subtitle: "tone", body: "body.en" },
    prepare({ title, subtitle, body }: { title?: string; subtitle?: string; body?: string }) {
      return { title: title || body || "Callout box", subtitle };
    },
  },
});

/**
 * A numbered walkthrough where each step can carry its own explanation, for
 * things like "how to book a room" where a plain bulleted list is not
 * enough.
 */
export const stepList = defineType({
  name: "stepList",
  title: "Step list",
  type: "object",
  icon: () => "🔢",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      description: "Optional. A short heading for the whole list, for example \"How to book a room\".",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      validation: (rule) => rule.required().min(1).error("Add at least one step."),
      of: [
        defineArrayMember({
          type: "object",
          name: "step",
          title: "Step",
          fields: [
            defineField({
              name: "title",
              title: "Step title",
              type: "localeString",
              description: "Short, one line, in Thai and English.",
              validation: (rule) => rule.required().custom(bilingualStringMessage),
            }),
            defineField({
              name: "detail",
              title: "Detail",
              type: "localeText",
              description: "Optional. Extra explanation for this step.",
              validation: (rule) => rule.custom(bilingualStringMessageOptional),
            }),
          ],
          preview: {
            select: { title: "title.en" },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "title.en", steps: "steps" },
    prepare({ title, steps }: { title?: string; steps?: unknown[] }) {
      return {
        title: title || "Step list",
        subtitle: steps ? `${steps.length} step${steps.length === 1 ? "" : "s"}` : undefined,
      };
    },
  },
});

/**
 * A contact card embedded directly in body text, for when a page needs to
 * point at a specific person or channel partway through, not just in the
 * sitewide help block.
 */
export const contactBlock = defineType({
  name: "contactBlock",
  title: "Contact block",
  type: "object",
  icon: () => "☎️",
  fields: helpContactFields,
  preview: {
    select: { title: "label.en", subtitle: "value" },
  },
});

/**
 * The shared rich text array type. Used as the `type` of every `localeBlock`
 * field's `th` and `en` sides.
 */
export const bodyPortableText = defineType({
  name: "bodyPortableText",
  title: "Body content",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: BLOCK_STYLES,
      lists: BLOCK_LISTS,
      marks: {
        decorators: BLOCK_DECORATORS,
        annotations: [],
      },
    }),
    defineArrayMember({ type: "image" }),
    defineArrayMember({ type: "formCallout" }),
    defineArrayMember({ type: "linkOut" }),
    defineArrayMember({ type: "calloutBox" }),
    defineArrayMember({ type: "stepList" }),
    defineArrayMember({ type: "contactBlock" }),
  ],
});
