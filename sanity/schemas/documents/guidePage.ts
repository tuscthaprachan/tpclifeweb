import { defineType } from "sanity";

import { contentPageFields } from "./contentPageFields";

/**
 * A how-to or orientation page: getting to TPC, using the library, and
 * similar practical guides. Shares its field list with `welfarePage` through
 * `contentPageFields`, since both implement the `ContentPage` interface and
 * differ only in `_type`.
 */
export const guidePage = defineType({
  name: "guidePage",
  title: "Guide page",
  type: "document",
  fields: contentPageFields("guidePage"),
  preview: {
    select: { title: "title.en", lastReviewed: "lastReviewed" },
    prepare({ title, lastReviewed }) {
      return {
        title: (title as string | undefined) || "Untitled page",
        subtitle: lastReviewed ? `Reviewed ${lastReviewed}` : "Not reviewed",
      };
    },
  },
});
