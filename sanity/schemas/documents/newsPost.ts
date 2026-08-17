import { defineArrayMember, defineField, defineType } from "sanity";

import { CATEGORY_OPTIONS, OWNER_OPTIONS } from "../constants";
import { bilingualBlockMessage, bilingualStringMessage } from "../objects/locale";

/**
 * A news post. Short, dated, and attributed to whichever body published it.
 */
export const newsPost = defineType({
  name: "newsPost",
  title: "News post",
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
      description: "Shown in lists and link previews. One or two sentences.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "localeBlock",
      validation: (rule) => rule.required().custom(bilingualBlockMessage),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "string",
      description: "Which body published this. Every governance item must be attributed to someone.",
      options: { list: OWNER_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Optional. Drives which colour this post is tagged with.",
      options: { list: CATEGORY_OPTIONS },
    }),
    defineField({
      name: "cover",
      title: "Cover image",
      type: "siteImage",
      description:
        "Optional. Shown at the top of the post and in news lists, cropped to 16:9, so a picture with the subject centred crops better than one with detail near the edges. Alt text is required unless the image is marked decorative. If the picture shows an identifiable person, get their agreement before publishing it on a public page.",
    }),
    defineField({
      name: "gallery",
      title: "Gallery",
      type: "array",
      of: [defineArrayMember({ type: "siteImage" })],
      description:
        "Optional. Additional pictures shown under the article, in the order listed here, cropped to 4:3. Alt text is required on each image unless it is marked decorative, and a caption is optional. If a picture shows an identifiable person, get their agreement before publishing it on a public page.",
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [defineArrayMember({ type: "localeString" })],
      description: "Optional. Short bilingual tags for filtering.",
    }),
  ],
  preview: {
    select: { title: "title.en", publishedAt: "publishedAt", media: "cover" },
    prepare({ title, publishedAt, media }) {
      const publishedDate =
        typeof publishedAt === "string" ? new Date(publishedAt).toLocaleDateString("en-GB") : undefined;
      return {
        title: (title as string | undefined) || "Untitled post",
        subtitle: publishedDate,
        media,
      };
    },
  },
});
