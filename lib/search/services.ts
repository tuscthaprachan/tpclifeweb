import type { SearchRecord } from "@/lib/content/types";
import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const WEIGHT_SERVICE = 100;

const path = (route: string) => ({ th: `/th${route}`, en: `/en${route}` });
const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" ");

function service(id: string, route: string, title: LocaleString, summary: LocaleString, keywords: string): SearchRecord {
  return {
    id: `service-${id}`,
    type: "service",
    path: path(route),
    title,
    summary,
    haystack: join(title.th, title.en, summary.th, summary.en, keywords),
    weight: WEIGHT_SERVICE,
  };
}

/** The services students do something in. They are routes of their own, not rows in the database, so they are indexed here. */
export function serviceSearchRecords(): SearchRecord[] {
  return [
    service("lost-and-found", "/lost-and-found", UI.lostAndFound, UI.lostAndFoundIntro, "ของหาย เก็บของได้ lost found property"),
    service("complaints", "/complaints", UI.cpServiceName, UI.cpIntro, "ร้องเรียน แจ้งปัญหา complaint report issue problem"),
    service("borrow", "/borrow", UI.brServiceName, UI.brIntro, "ยืม อุปกรณ์ borrow equipment loan"),
  ];
}
