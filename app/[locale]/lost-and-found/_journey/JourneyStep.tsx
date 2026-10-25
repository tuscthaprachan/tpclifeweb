/**
 * One question page of a public journey, rendered on the server. Nothing here
 * needs JavaScript: each page is a plain form that posts to a Server Action
 * (./actions.ts), which redirects to the next page or back here with errors.
 *
 * The draft comes from the httpOnly cookie. With no draft (never started, or
 * expired after two hours) the reader goes back to the start page.
 */

import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { categoryLabel, LOST_FOUND_CATEGORIES } from "@/components/domain/lostfound";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Checkboxes, Container, DateInput, ErrorSummary, Heading, InsetText, NotificationBanner, Radios, Select, Stack, Textarea, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { getPlaces } from "@/lib/content";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { readJourneyToken } from "@/lib/lost-found/public/cookies";
import { isStep, journeyBasePath, previousStep, stepPath, type DraftValues, type JourneyKind } from "@/lib/lost-found/public/steps";
import { loadJourney, saveJourney, type JourneyData } from "@/lib/lost-found/public/store";
import { firstProblem } from "@/lib/lost-found/public/validate";
import { saveStep } from "./actions";
import { CheckAnswers } from "./CheckAnswers";
import { Confirmation } from "./Confirmation";
import { errorAnchor, journeyName, stepTitle } from "./copy";
import { Unavailable } from "./Unavailable";

interface JourneyStepProps {
  kind: JourneyKind;
  locale: string;
  step: string;
  slug?: string;
  from?: string;
  email?: string;
}

/** Heading that doubles as a form legend, so the question is read once. */
function Question({ children }: { children: ReactNode }) {
  return (
    <Heading level={1} className="m-0">
      {children}
    </Heading>
  );
}

function BackLink({ href, locale }: { href: string; locale: Locale }) {
  return (
    <a href={href} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
      {UI.back[locale]}
    </a>
  );
}

export async function JourneyStep({ kind, locale: rawLocale, step, slug, from, email }: JourneyStepProps) {
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  if (!isStep(kind, step)) notFound();

  const base = localePath(locale, journeyBasePath(kind, slug));
  const crumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: UI.lostAndFound[locale], path: "/lost-and-found" },
        { label: journeyName(kind, locale), path: journeyBasePath(kind, slug) },
        { label: stepTitle(kind, step, locale) },
      ]}
    />
  );
  if (!isDatabaseConfigured() || !isPiiAvailable()) {
    return <Unavailable locale={locale} title={journeyName(kind, locale)} breadcrumbs={crumbs} />;
  }

  const db = getDb();
  const loaded = await loadJourney(db, await readJourneyToken(kind), kind);
  if (!loaded || (kind === "claim" && loaded.data.slug !== slug)) redirect(`${base}?expired=1`);
  const data: JourneyData = loaded.data;

  // Once sent, the only page that makes sense is the confirmation.
  if (data.result && step !== "confirmation") redirect(localePath(locale, stepPath(kind, "confirmation", slug)));

  if (step === "confirmation") {
    if (!data.result) redirect(base);
    return <Confirmation kind={kind} locale={locale} slug={slug} result={data.result} email={email} crumbs={crumbs} />;
  }

  // Show the errors from the last rejected post once, then forget them.
  const flash = data.flash && data.flash.step === step ? data.flash : undefined;
  if (data.flash) await saveJourney(db, loaded.id, { ...data, flash: undefined });

  if (step === "check") {
    const problem = firstProblem(kind, data.values);
    if (problem) {
      await saveJourney(db, loaded.id, { ...data, flash: { step: problem.step, errors: problem.errors } });
      redirect(localePath(locale, stepPath(kind, problem.step, slug)));
    }
    const places = await getPlaces();
    const place = data.values.placeId ? places.find((p) => p._id === data.values.placeId) : undefined;
    return (
      <Container width="narrow">
        {crumbs}
        <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
          <BackLink href={localePath(locale, stepPath(kind, previousStep(kind, "check")!, slug))} locale={locale} />
          {flash?.errors.form ? (
            <NotificationBanner variant="warning" title={UI.lfpSubmitProblemTitle[locale]}>
              {UI[flash.errors.form][locale]}
            </NotificationBanner>
          ) : null}
          <CheckAnswers kind={kind} locale={locale} slug={slug} values={data.values} placeName={place ? pick(place.name, locale) : undefined} />
        </Stack>
      </Container>
    );
  }

  const items: ErrorSummaryItem[] = flash
    ? Object.entries(flash.errors).flatMap(([field, key]) => (key && field !== "form" ? [{ href: errorAnchor(field), message: UI[key][locale] }] : []))
    : [];
  const err = (field: string) => {
    const key = flash?.errors[field];
    return key ? UI[key][locale] : undefined;
  };

  const fromCheck = from === "check";
  const previous = previousStep(kind, step);
  const backHref = fromCheck
    ? localePath(locale, stepPath(kind, "check", slug))
    : previous
      ? localePath(locale, stepPath(kind, previous, slug))
      : base;

  const title = stepTitle(kind, step, locale);
  const values = data.values;
  const places = step === "where" ? await getPlaces() : [];

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <BackLink href={backHref} locale={locale} />
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        <form action={saveStep} noValidate>
          <input type="hidden" name="journey" value={kind} />
          <input type="hidden" name="step" value={step} />
          <input type="hidden" name="locale" value={locale} />
          {slug ? <input type="hidden" name="slug" value={slug} /> : null}
          {fromCheck ? <input type="hidden" name="from" value="check" /> : null}
          <Stack space={6}>
            {step === "category" ? (
              <Radios
                id="category"
                name="category"
                legend={<Question>{title}</Question>}
                defaultValue={values.category}
                error={err("category")}
                options={LOST_FOUND_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c, locale) }))}
              />
            ) : null}

            {step === "describe" ? <DescribeFields kind={kind} locale={locale} title={title} values={values} err={err} /> : null}

            {step === "where" ? (
              <>
                <Question>{title}</Question>
                <Select
                  id="placeId"
                  name="placeId"
                  label={UI.lfpPlaceLabel[locale]}
                  hint={UI.lfpPlaceHint[locale]}
                  error={err("placeId")}
                  defaultValue={values.placeId}
                  options={[{ value: "", label: UI.lfpSomewhereElse[locale] }, ...places.map((p) => ({ value: p._id, label: pick(p.name, locale) }))]}
                />
                <TextInput id="locationNote" name="locationNote" label={UI.lfpPlaceNoteLabel[locale]} hint={UI.lfpPlaceNoteHint[locale]} error={err("locationNote")} defaultValue={values.locationNote} autoComplete="off" />
              </>
            ) : null}

            {step === "when" ? (
              <DateInput
                id="when"
                legend={<Question>{title}</Question>}
                hint={UI.lfpWhenHint[locale]}
                error={err("when")}
                dayLabel={UI.day[locale]}
                monthLabel={UI.month[locale]}
                yearLabel={UI.year[locale]}
                defaultValue={{ day: values.day, month: values.month, year: values.year }}
              />
            ) : null}

            {step === "detail" ? (
              <>
                <Question>{title}</Question>
                <Textarea id="detail" name="detail" label={UI.lfpDetailLabel[locale]} hint={UI.lfpDetailHint[locale]} error={err("detail")} defaultValue={values.detail} rows={4} autoComplete="off" />
              </>
            ) : null}

            {step === "now" ? (
              <Radios
                id="whereNow"
                name="whereNow"
                legend={<Question>{title}</Question>}
                error={err("whereNow")}
                defaultValue={values.whereNow}
                options={[
                  { value: "will_hand_in", label: UI.lfpWhereNowHandIn[locale] },
                  { value: "left_there", label: UI.lfpWhereNowLeftThere[locale] },
                  { value: "need_help", label: UI.lfpWhereNowNeedHelp[locale] },
                ]}
              />
            ) : null}

            {step === "proof" ? (
              <>
                <Question>{title}</Question>
                <Textarea id="proof" name="proof" label={UI.lfpProofLabel[locale]} hint={UI.lfpProofHint[locale]} error={err("proof")} defaultValue={values.proof} rows={5} autoComplete="off" />
              </>
            ) : null}

            {step === "contact" ? <ContactFields kind={kind} locale={locale} title={title} values={values} err={err} /> : null}

            <div>
              <Button type="submit">{fromCheck ? UI.lfpSaveAndCheck[locale] : UI.lfpContinue[locale]}</Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

type Err = (field: string) => string | undefined;

function DescribeFields({ kind, locale, title, values, err }: { kind: JourneyKind; locale: Locale; title: string; values: DraftValues; err: Err }) {
  return (
    <>
      <Question>{title}</Question>
      <InsetText>
        <p className="m-0">{(kind === "found" ? UI.lfpDescribeGuidanceFound : UI.lfpDescribeGuidanceLost)[locale]}</p>
      </InsetText>
      <TextInput id="title" name="title" label={UI.lfpTitleLabel[locale]} hint={UI.lfpTitleHint[locale]} error={err("title")} defaultValue={values.title} autoComplete="off" />
      <Textarea id="description" name="description" label={UI.lfpDescriptionLabel[locale]} hint={UI.lfpDescriptionHint[locale]} error={err("description")} defaultValue={values.description} rows={6} autoComplete="off" />
    </>
  );
}

function ContactFields({ kind, locale, title, values, err }: { kind: JourneyKind; locale: Locale; title: string; values: DraftValues; err: Err }) {
  const hint =
    kind === "lost"
      ? UI.lfpContactHintLost[locale]
      : kind === "claim"
        ? UI.lfpContactHintClaim[locale]
        : values.whereNow === "need_help"
          ? UI.lfpContactHintFoundNeedHelp[locale]
          : UI.lfpContactHintFound[locale];
  return (
    <>
      <Stack space={2}>
        <Question>{title}</Question>
        <p className="m-0 text-ink-600">{hint}</p>
      </Stack>
      <TextInput id="name" name="name" label={UI.lfpNameLabel[locale]} error={err("name")} defaultValue={values.name} autoComplete="name" />
      <TextInput id="email" name="email" type="email" label={UI.lfpEmailLabel[locale]} hint={UI.lfpEmailHint[locale]} error={err("email")} defaultValue={values.email} autoComplete="email" spellCheck={false} />
      <TextInput id="phone" name="phone" type="tel" label={UI.lfpPhoneLabel[locale]} error={err("phone")} defaultValue={values.phone} autoComplete="tel" />
      <TextInput id="lineId" name="lineId" label={UI.lfpLineLabel[locale]} error={err("lineId")} defaultValue={values.lineId} autoComplete="off" spellCheck={false} />
      <Radios
        id="preferred"
        name="preferred"
        legend={UI.lfpPreferredLegend[locale]}
        hint={UI.lfpPreferredHint[locale]}
        error={err("preferred")}
        defaultValue={values.preferred}
        options={[
          { value: "email", label: UI.lfpPreferredEmail[locale] },
          { value: "phone", label: UI.lfpPreferredPhone[locale] },
          { value: "line", label: UI.lfpPreferredLine[locale] },
        ]}
      />
      <Checkboxes
        id="consent"
        name="consent"
        legend={UI.lfpConsentLegend[locale]}
        error={err("consent")}
        defaultValue={values.consent === "yes" ? ["yes"] : []}
        options={[{ value: "yes", label: (kind === "claim" ? UI.lfpConsentClaim : UI.lfpConsentReport)[locale] }]}
      />
    </>
  );
}
