import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace } from "@/lib/sanity/types";
import { Heading, StatusTag, SummaryList } from "@/components/ui";
import { getPlaceHoursStatus, type PlaceHoursStatus } from "./openingHours";

/*
 * TODO: add to UI strings. No shared heading exists for this specific block;
 * UI.atAGlance names the whole "at a glance" section, not the opening-hours
 * list inside it. Using a local literal, reported in the home agent's final
 * report.
 */
const KEY_OPENING_HOURS_TITLE: LocaleString = {
  th: "เวลาทำการสถานที่สำคัญวันนี้",
  en: "Key opening hours today",
};

/*
 * TODO: add to UI strings. No shared copy exists for "no opening hours have
 * been published for any key location yet". Using a local literal, following
 * the same pattern ShuttlePanel already uses for its own missing-timetable
 * note.
 */
const NO_HOURS_NOTE: LocaleString = {
  th: "ยังไม่มีการเผยแพร่เวลาทำการของสถานที่สำคัญ",
  en: "Opening hours for key locations have not been published yet",
};

interface KeyOpeningHoursProps {
  locale: Locale;
  places: CampusPlace[];
  /** Depth of this block's own heading in the page outline (1.3.1, 2.4.6). */
  headingLevel: HeadingLevel;
  now?: Date;
}

/**
 * The "today's key opening hours" row of the at-a-glance block. A
 * `SummaryList`, not a grid of tiles: one row per place, place name on the
 * left, today's status on the right, so it reads as a dense list rather than
 * a set of equal-weight cards (CONTRIBUTING.md, "Avoid bento grids").
 *
 * `place.closureNote`, when an editor has set one, always wins over the
 * computed weekly schedule: it exists precisely to say "closed today for a
 * reason the weekly template cannot express" (a holiday, maintenance), and
 * showing a computed "open" underneath that would contradict the editor.
 */
export function KeyOpeningHours({ locale, places, headingLevel, now = new Date() }: KeyOpeningHoursProps) {
  return (
    <div>
      <Heading level={headingLevel} className="m-0 mb-[var(--space-2)] text-base">
        {pick(KEY_OPENING_HOURS_TITLE, locale)}
      </Heading>
      {places.length === 0 ? (
        <p className="m-0 text-ink-600">{pick(NO_HOURS_NOTE, locale)}</p>
      ) : (
        <SummaryList
          rows={places.map((place) => ({
            key: pick(place.name, locale),
            value: (
              <PlaceStatusValue
                locale={locale}
                status={place.closureNote ? { kind: "closed", note: place.closureNote } : getPlaceHoursStatus(place, now)}
              />
            ),
          }))}
        />
      )}
    </div>
  );
}

function PlaceStatusValue({ locale, status }: { locale: Locale; status: PlaceHoursStatus }) {
  switch (status.kind) {
    case "open":
      return (
        <span className="inline-flex flex-wrap items-center gap-[var(--space-2)]">
          <StatusTag tone="success" label={UI.openNow[locale]} />
          <span className="text-sm text-ink-600">
            {UI.closesAt[locale]} {status.closes}
          </span>
          {status.note ? <span className="text-sm text-ink-600">{pick(status.note, locale)}</span> : null}
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex flex-wrap items-center gap-[var(--space-2)]">
          <StatusTag tone="neutral" label={UI.closedNow[locale]} />
          {status.opensNext ? (
            <span className="text-sm text-ink-600">
              {UI.opensAt[locale]} {status.opensNext}
            </span>
          ) : null}
          {status.note ? <span className="text-sm text-ink-600">{pick(status.note, locale)}</span> : null}
        </span>
      );
    case "noHours":
      return <span className="text-sm text-ink-600">{pick(NO_HOURS_NOTE, locale)}</span>;
  }
}
