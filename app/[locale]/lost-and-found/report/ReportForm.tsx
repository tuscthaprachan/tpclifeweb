"use client";

/**
 * The report form itself. A Client Component only because `useActionState`
 * requires one: per node_modules/next/dist/docs/01-app/02-guides/forms.md
 * ("Validation errors"), a form built this way stays fully progressively
 * enhanced. With JavaScript disabled the browser does a real POST to
 * `submitLostFoundReport` and Next server-renders the resulting HTML
 * (including any validation errors) as the response; with JavaScript on, the
 * same round trip happens without a full page reload. Nothing here behaves
 * differently in the two cases, which is the point.
 *
 * The `kind` radio also drives which of the two per-kind labels
 * (UI.dateLost/UI.dateFound, UI.whereLost/UI.whereFound) are shown for the
 * date and location fields. That relabelling is a JavaScript enhancement
 * only: without JavaScript the labels simply stay at whichever kind the page
 * loaded with (set from the `?kind=` link on the register page, defaulting
 * to "lost"), which is still the correct question, just not relabelled if
 * the reader then switches the radio. The data submitted is identical
 * either way, only the copy differs.
 */

import { useActionState, useState } from "react";
import { Button, DateInput, ErrorSummary, NotificationBanner, Radios, Select, Stack, Textarea, TextInput, type ErrorSummaryItem, type SelectOption } from "@/components/ui";
import { categoryLabel, kindLabel, LOST_FOUND_CATEGORIES } from "@/components/domain/lostfound";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace, LostFoundKind } from "@/lib/sanity/types";
import { submitLostFoundReport, type LostFoundReportState } from "./actions";

interface ReportFormProps {
  locale: Locale;
  initialKind: LostFoundKind;
  places: CampusPlace[];
  /** Server-rendered instant this page was generated, used for the
   * minimum-time-on-page anti-spam check in actions.ts. */
  renderedAt: string;
}

function emptyValues(kind: LostFoundKind): LostFoundReportState {
  return {
    errors: {},
    values: {
      kind,
      title: "",
      category: "",
      description: "",
      staffDetail: "",
      place: "",
      locationNote: "",
      day: "",
      month: "",
      year: "",
      contact: "",
    },
  };
}

export function ReportForm({ locale, initialKind, places, renderedAt }: ReportFormProps) {
  const [state, formAction, pending] = useActionState(submitLostFoundReport, emptyValues(initialKind));
  const [kind, setKind] = useState<LostFoundKind>(state.values.kind);

  const errorFieldTargets: Array<[keyof LostFoundReportState["errors"], string]> = [
    ["kind", "lost-found-report-kind"],
    ["title", "lost-found-report-title"],
    ["category", "lost-found-report-category"],
    ["description", "lost-found-report-description"],
    ["occurredOn", "lost-found-report-occurredon-day"],
    ["location", "lost-found-report-location-note"],
    ["contact", "lost-found-report-contact"],
  ];

  const errorItems: ErrorSummaryItem[] = errorFieldTargets
    .filter(([field]) => state.errors[field])
    .map(([field, id]) => ({ href: `#${id}`, message: state.errors[field] as string }));

  const placeOptions: SelectOption[] = [
    { value: "", label: UI.notInThisList[locale] },
    ...places.map((place) => ({ value: place._id, label: pick(place.name, locale) })),
  ];

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="renderedAt" value={renderedAt} />

      {/* Honeypot. Hidden from every real reader (aria-hidden, off the tab
          order, positioned off-screen rather than display:none, which some
          scripted submitters specifically know to skip). A field a human
          never sees and never reaches by keyboard, but an automated form
          filler that reads the DOM directly will still find and fill. */}
      {/*
        Moved off-screen by position alone, with no 1px clamp and no
        `overflow: hidden`. Clamping it tripped the 1.4.12 Text Spacing
        check, which applies the WCAG spacing override and then fails any
        box whose content is clipped by it. Nothing here needs clipping:
        `left: -9999px` already takes the field out of sight, and
        `aria-hidden` plus `tabIndex={-1}` keep it away from assistive
        technology and the tab order, so only a bot filling every input
        finds it.
      */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto" }}>
        <label htmlFor="lost-found-report-website">Website</label>
        <input id="lost-found-report-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Stack space={6}>
        {/*
          `beforeYouStart` rather than repeating `reportLostFoundIntro`,
          which the page already renders as its intro paragraph directly
          above this banner. The same sentence twice in a row reads as a
          rendering fault, and the forms section already uses this heading
          for the same job, so reusing it keeps one word for one thing.
        */}
        <NotificationBanner variant="info" title={UI.beforeYouStart[locale]}>
          {UI.reportLostFoundPrivacy[locale]}
        </NotificationBanner>

        {state.errors.form ? (
          <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
            {state.errors.form}
          </NotificationBanner>
        ) : null}

        {errorItems.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={errorItems} /> : null}

        <Radios
          id="lost-found-report-kind"
          legend={UI.lostOrFound[locale]}
          name="kind"
          value={kind}
          onValueChange={(value) => setKind(value === "found" ? "found" : "lost")}
          options={[
            { value: "lost", label: kindLabel("lost", locale) },
            { value: "found", label: kindLabel("found", locale) },
          ]}
        />

        <TextInput id="lost-found-report-title" name="title" label={UI.whatIsIt[locale]} defaultValue={state.values.title} error={state.errors.title} required />

        <Select
          id="lost-found-report-category"
          name="category"
          label={UI.category[locale]}
          error={state.errors.category}
          defaultValue={state.values.category || LOST_FOUND_CATEGORIES[0]}
          options={LOST_FOUND_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category, locale) }))}
        />

        <Textarea
          id="lost-found-report-description"
          name="description"
          label={UI.describeIt[locale]}
          defaultValue={state.values.description}
          error={state.errors.description}
          required
        />

        <Textarea
          id="lost-found-report-staff-detail"
          name="staffDetail"
          label={UI.privateDetail[locale]}
          hint={UI.reportLostFoundHoldBack[locale]}
          defaultValue={state.values.staffDetail}
          rows={2}
        />

        <DateInput
          id="lost-found-report-occurredon"
          legend={kind === "found" ? UI.dateFound[locale] : UI.dateLost[locale]}
          error={state.errors.occurredOn}
          dayLabel={UI.day[locale]}
          monthLabel={UI.month[locale]}
          yearLabel={UI.year[locale]}
          defaultValue={{ day: state.values.day, month: state.values.month, year: state.values.year }}
        />

        <Stack space={4}>
          <Select
            id="lost-found-report-place"
            name="place"
            label={kind === "found" ? UI.whereFound[locale] : UI.whereLost[locale]}
            defaultValue={state.values.place}
            options={placeOptions}
          />
          <TextInput
            id="lost-found-report-location-note"
            name="locationNote"
            label={UI.describeLocation[locale]}
            defaultValue={state.values.locationNote}
            error={state.errors.location}
          />
        </Stack>

        <TextInput
          id="lost-found-report-contact"
          name="contact"
          label={UI.yourContact[locale]}
          hint={UI.yourContactHint[locale]}
          defaultValue={state.values.contact}
          error={state.errors.contact}
          required
        />

        <p className="m-0 text-sm text-ink-600">{UI.reportNoPhotoNote[locale]}</p>

        <div>
          <Button type="submit" loading={pending} loadingLabel={UI.sending[locale]}>
            {UI.submitReport[locale]}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
