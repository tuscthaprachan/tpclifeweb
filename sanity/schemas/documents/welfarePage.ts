import { defineType } from "sanity";

import { contentPageFields } from "./contentPageFields";

/**
 * A student welfare page: health, wellbeing, and support services. Shares
 * its field list with `guidePage` through `contentPageFields`, since both
 * implement the `ContentPage` interface and differ only in `_type`.
 */
export const welfarePage = defineType({
  name: "welfarePage",
  title: "Welfare page",
  type: "document",
  fields: contentPageFields("welfarePage"),
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
