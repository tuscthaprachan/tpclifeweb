import type { ContentEntityType } from "./revalidate";

/** The route segment of the detail page for kinds that have one, so a changed slug's own page is refreshed and redirected. */
export const DETAIL_ROUTE: Partial<Record<ContentEntityType, string>> = {
  form: "/forms",
  newsPost: "/news",
  event: "/events",
  policy: "/policy",
  welfarePage: "/welfare",
  guidePage: "/guide",
  lostFoundItem: "/lost-and-found",
  place: "/places",
  shuttleRoute: "/getting-around/shuttle",
};
