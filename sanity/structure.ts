import type { StructureResolver } from "sanity/structure";

import { apiVersion } from "@/lib/sanity/env";
import { CANTEEN_PRICE_STALE_DAYS } from "@/sanity/schemas/constants";

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
  const stalePriceCutoff = new Date();
  stalePriceCutoff.setDate(stalePriceCutoff.getDate() - CANTEEN_PRICE_STALE_DAYS);

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

      /*
       * Lost and found. The queue comes first because it is the only list in
       * this Studio that fills up on its own: the public report form writes
       * drafts, and a draft nobody looks at is a student whose report went
       * nowhere. `_id in path("drafts.**")` is how Sanity expresses "not yet
       * published"; the site reads with `perspective: "published"`, so
       * everything in that queue is invisible to readers until approved.
       */
      S.listItem()
        .title("Lost and found")
        .child(
          S.list()
            .title("Lost and found")
            .items([
              S.listItem()
                .title("Waiting for approval")
                .child(
                  S.documentList()
                    .title("Waiting for approval")
                    .apiVersion(apiVersion)
                    .filter('_type == "lostFoundItem" && _id in path("drafts.**")')
                    .defaultOrdering([{ field: "_createdAt", direction: "desc" }]),
                ),
              S.listItem()
                .title("Still open")
                .child(
                  S.documentList()
                    .title("Still open")
                    .apiVersion(apiVersion)
                    .filter('_type == "lostFoundItem" && status == "open"')
                    .defaultOrdering([{ field: "occurredOn", direction: "desc" }]),
                ),
              S.listItem()
                .title("Past the collection date")
                .child(
                  S.documentList()
                    .title("Past the collection date")
                    .apiVersion(apiVersion)
                    .filter(
                      '_type == "lostFoundItem" && kind == "found" && status == "open" && defined(claimBy) && claimBy < $today',
                    )
                    .params({ today: new Date().toISOString().slice(0, 10) })
                    .defaultOrdering([{ field: "claimBy", direction: "asc" }]),
                ),
              S.documentTypeListItem("lostFoundItem").title("Every entry"),
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

      /*
       * Canteen. Prices are surveyed, so the list that matters most is the one
       * that shows which dishes have gone too long without a price check. A
       * dish with no `checkedOn` at all counts as not checked.
       */
      S.listItem()
        .title("Canteen")
        .child(
          S.list()
            .title("Canteen")
            .items([
              S.listItem()
                .title("Stalls")
                .child(
                  S.documentTypeList("canteenStall")
                    .title("Stalls")
                    .defaultOrdering([{ field: "number", direction: "asc" }]),
                ),
              S.listItem()
                .title("Dishes")
                .child(
                  S.documentTypeList("canteenDish")
                    .title("Dishes")
                    .defaultOrdering([{ field: "name.en", direction: "asc" }]),
                ),
              S.documentTypeListItem("canonicalDish").title("Canonical dishes"),
              S.listItem()
                .title(`Prices not checked in ${CANTEEN_PRICE_STALE_DAYS} days`)
                .child(
                  S.documentList()
                    .title(`Prices not checked in ${CANTEEN_PRICE_STALE_DAYS} days`)
                    .apiVersion(apiVersion)
                    .filter('_type == "canteenDish" && (!defined(checkedOn) || checkedOn < $cutoff)')
                    .params({ cutoff: stalePriceCutoff.toISOString().slice(0, 10) })
                    .defaultOrdering([{ field: "checkedOn", direction: "asc" }]),
                ),
              S.divider(),
              S.listItem()
                .title("Canteen settings")
                .child(
                  S.document()
                    .schemaType("canteenSettings")
                    .documentId("canteenSettings")
                    .title("Canteen settings"),
                ),
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
