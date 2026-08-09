import { defineField, defineType, type FieldDefinition } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

/**
 * One way to reach a real person. Used on `siteSettings` for the help block
 * that appears in the same place on every page (3.2.6 Consistent Help), and
 * on a `form` for who to ask if the student gets stuck partway through.
 *
 * The field list is also reused by the `contactBlock` portable text object,
 * so a contact card can be dropped straight into a page body with the same
 * fields.
 */
export const helpContactFields: FieldDefinition[] = [
  defineField({
    name: "label",
    title: "Label",
    type: "localeString",
    description: 'What to call this contact, for example "Student welfare LINE" or "Room W101".',
    validation: (rule) => rule.required().custom(bilingualStringMessage),
  }),
  defineField({
    name: "channel",
    title: "Channel",
    type: "string",
    description: "How the student reaches this contact.",
    options: {
      list: [
        { title: "LINE", value: "line" },
        { title: "Email", value: "email" },
        { title: "Phone", value: "phone" },
        { title: "In person", value: "inPerson" },
        { title: "Website", value: "url" },
      ],
    },
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "value",
    title: "Value",
    type: "string",
    description:
      "The actual contact detail: the LINE ID, the email address, the phone number, the web address, or the room and building for an in person contact.",
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "hours",
    title: "Hours",
    type: "localeString",
    description: "Optional. When someone actually answers, for example weekdays 9:00 to 16:00.",
    validation: (rule) => rule.custom(bilingualStringMessageOptional),
  }),
];

export const helpContact = defineType({
  name: "helpContact",
  title: "Help contact",
  type: "object",
  fields: helpContactFields,
});
