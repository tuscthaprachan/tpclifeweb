import { Timestamp } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusEvent } from "@/lib/sanity/types";

type ScheduleFields = Pick<CampusEvent, "startsAt" | "endsAt" | "isAllDay">;

/**
 * The event's date and time, honouring `isAllDay`: a whole-day event never
 * shows a meaningless 00:00 clock time, it shows the date and the words
 * "All day" instead. Every value still goes through `Timestamp`, so there is
 * always a machine-readable `<time datetime>` alongside the visible text.
 */
export function EventSchedule({ event, locale }: { event: ScheduleFields; locale: Locale }) {
  if (event.isAllDay) {
    return (
      <span className="inline-flex flex-wrap items-center gap-[var(--space-1)]">
        <Timestamp value={event.startsAt} locale={locale} format="date" />
        <span aria-hidden="true">·</span>
        <span>{UI.allDay[locale]}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-[var(--space-1)]">
      <Timestamp value={event.startsAt} locale={locale} format="datetime" />
      {event.endsAt ? (
        <>
          <span aria-hidden="true">–</span>
          <Timestamp value={event.endsAt} locale={locale} format="datetime" />
        </>
      ) : null}
    </span>
  );
}
