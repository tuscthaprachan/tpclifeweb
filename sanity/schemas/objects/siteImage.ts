import { defineField, defineType } from "sanity";

/**
 * The site-wide image type, based on Sanity's built-in `image`.
 *
 * It must NOT be named `image`. Sanity reserves the built-in type names, and
 * registering a custom type over one of them fails schema validation with
 * `Invalid type name: "image" is a reserved name`, which takes down the whole
 * Studio at `/studio` with a 500 rather than degrading. The consequence is
 * that image fields do not inherit these fields automatically: every field
 * that wants alt text and a caption must say `type: "siteImage"` explicitly.
 * If you add an image field anywhere, use `siteImage`, not `image`.
 *
 * WCAG 1.1.1 is not negotiable: an image either says what it shows, in both
 * languages, or is explicitly marked as decorative. There is no third
 * option. `lib/sanity/types.ts` types `alt` as optional because TypeScript
 * cannot express "required unless `isDecorative` is true", but the
 * validation below enforces exactly that at publish time.
 */
export const siteImage = defineType({
  name: "siteImage",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "isDecorative",
      title: "Decorative image",
      type: "boolean",
      initialValue: false,
      description:
        "Turn this on only if the image shows nothing a reader needs to know, for example a plain background pattern. Most images on this site are not decorative. When this is off, alt text is required.",
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "localeString",
      description:
        "Say what the image shows, in one short sentence, in Thai and in English. A screen reader reads this instead of the image. Do not start with \"Image of\" or \"Picture of\", just describe it directly.",
      validation: (rule) =>
        rule.custom((value: { th?: string; en?: string } | undefined, context) => {
          const parent = context.parent as { isDecorative?: boolean } | undefined;
          if (parent?.isDecorative) return true;
          const th = value?.th?.trim();
          const en = value?.en?.trim();
          if (th && en) return true;
          return 'Add alt text in Thai and English, or turn on "Decorative image" above if this image has no meaning of its own.';
        }),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "localeString",
      description:
        "Optional. A short line shown under the image, in Thai and English. Leave both sides empty if there is no caption.",
      validation: (rule) =>
        rule.custom((value: { th?: string; en?: string } | undefined) => {
          const th = Boolean(value?.th && value.th.trim());
          const en = Boolean(value?.en && value.en.trim());
          if (th === en) return true;
          return th
            ? "Add the English caption too, or clear the Thai caption."
            : "Add the Thai caption too, or clear the English caption.";
        }),
    }),
  ],
  preview: {
    select: {
      media: "asset",
      title: "alt.en",
      subtitle: "alt.th",
    },
  },
});
