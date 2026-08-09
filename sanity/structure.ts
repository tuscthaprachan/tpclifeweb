import type { StructureResolver } from "sanity/structure";

import { apiVersion } from "@/lib/sanity/env";

/**
 * Desk structure, grouped by what an editor is actually trying to do rather
 * than by raw schema name. "Live now" surfaces the two things that change
 * most often and matter most in the moment (alerts, shuttle). Everything
 * else follows the shape of the site: forms, ordinary content, governance,
 * the directory, and settings last.
 */
export const structure: StructureResolver = (S) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return S.list()
    .title("TPC Life")
    .items([
      S.listItem()
        .title("Live now")
        .child(
          S.list()
            .title("Live now")
            .items([
              S.documentTypeListItem("serviceAlert").title("Service alerts"),
              S.documentTypeListItem("shuttleRoute").title("Shuttle routes"),
            ]),
        ),

      S.listItem()
        .title("Forms")
        .child(S.documentTypeList("form").title("Forms")),

      S.listItem()
        .title("Content")
        .child(
          S.list()
            .title("Content")
            .items([
              S.documentTypeListItem("newsPost").title("News"),
              S.documentTypeListItem("event").title("Events"),
              S.documentTypeListItem("welfarePage").title("Welfare pages"),
              S.documentTypeListItem("guidePage").title("Guide pages"),
              S.documentTypeListItem("faq").title("FAQs"),
            ]),
        ),

      S.listItem()
        .title("Governance")
        .child(S.documentTypeList("policy").title("Policies")),

      S.listItem()
        .title("Directory")
        .child(
          S.list()
            .title("Directory")
            .items([
              S.documentTypeListItem("organisation").title("Organisations"),
              S.documentTypeListItem("place").title("Places"),
            ]),
        ),

      S.divider(),

      S.listItem()
        .title("Not reviewed in 6 months")
        .child(
          S.documentList()
            .title("Not reviewed in 6 months")
            .apiVersion(apiVersion)
            .filter(
              '_type in ["welfarePage", "guidePage"] && (!defined(lastReviewed) || lastReviewed < $cutoff)',
            )
            .params({ cutoff: sixMonthsAgo.toISOString().slice(0, 10) }),
        ),

      S.divider(),

      S.listItem()
        .title("Settings")
        .child(
          S.document().schemaType("siteSettings").documentId("siteSettings").title("Site settings"),
        ),
    ]);
};
