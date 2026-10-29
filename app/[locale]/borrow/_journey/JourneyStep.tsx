/**
 * One question page of the borrowing journey, rendered on the server. Nothing
 * here needs JavaScript: each page is a plain form that posts to a Server
 * Action (./actions.ts), which redirects to the next page or back here with
 * errors.
 *
 * The draft comes from the httpOnly cookie. With no draft (never started, or
 * expired after two hours) the reader goes back to the start page. A page whose
 * earlier answers no longer hold (the dates moved and an item is no longer
 * free) sends the reader back to that earlier page.
 */

import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, ErrorSummary, NotificationBanner, Radios, Select, Stack, Textarea, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { readJourneyToken } from "@/lib/borrowing/public/cookies";
import { isStep, JOURNEY_BASE, previousStep, stepPath } from "@/lib/borrowing/public/steps";
import { loadJourney, saveJourney } from "@/lib/borrowing/public/store";
import { loadContext } from "@/lib/borrowing/public/submit";
import { firstProblem, LIMITS, misroute } from "@/lib/borrowing/public/validate";
import { getFacultiesWithOrganisations } from "@/lib/content";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { saveStep } from "./actions";
import { BackLink } from "./BackLink";
import { CheckAnswers } from "./CheckAnswers";
import { Confirmation } from "./Confirmation";
import { errorAnchor, errorMessage, stepTitle } from "./copy";
import { DatesStep } from "./DatesStep";
import { ItemsStep } from "./ItemsStep";
import { Question } from "./Question";
import { QuantitiesStep } from "./QuantitiesStep";
import { TermsStep } from "./TermsStep";
import { Unavailable } from "./Unavailable";

interface JourneyStepProps {
  locale: string;
  step: string;
  from?: string;
  email?: string;
}

export async function JourneyStep({ locale: rawLocale, step, from, email }: JourneyStepProps) {
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  if (!isStep(step)) notFound();

  const base = localePath(locale, JOURNEY_BASE);
  const crumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: UI.brServiceName[locale], path: JOURNEY_BASE },
        { label: stepTitle(step, locale) },
      ]}
    />
  );
  if (!isDatabaseConfigured() || !isPiiAvailable()) {
    return <Unavailable locale={locale} title={UI.brServiceName[locale]} breadcrumbs={crumbs} />;
  }

  const db = getDb();
  const loaded = await loadJourney(db, await readJourneyToken());
  if (!loaded) redirect(`${base}?expired=1`);
  const data = loaded.data;
  const values = data.values;

  // Once sent, the only page that makes sense is the confirmation.
  if (data.result && step !== "confirmation") redirect(localePath(locale, stepPath("confirmation")));
  if (step === "confirmation") {
    if (!data.result) redirect(base);
    return <Confirmation locale={locale} result={data.result} email={email} crumbs={crumbs} />;
  }

  // Show the errors from the last rejected post once, then forget them.
  const flash = data.flash && data.flash.step === step ? data.flash : undefined;
  if (data.flash) await saveJourney(db, loaded.id, { ...data, flash: undefined });

  const ctx = await loadContext(db, values);

  // No page before the questions ahead of it are answered and still hold.
  const elsewhere = misroute(step, values, ctx);
  if (elsewhere) {
    if (Object.keys(elsewhere.errors).length > 0) await saveJourney(db, loaded.id, { ...data, flash: { step: elsewhere.step, errors: elsewhere.errors } });
    redirect(localePath(locale, stepPath(elsewhere.step)));
  }

  if (step === "check") {
    const problem = firstProblem(values, ctx);
    if (problem) {
      await saveJourney(db, loaded.id, { ...data, flash: { step: problem.step, errors: problem.errors } });
      redirect(localePath(locale, stepPath(problem.step)));
    }
    const faculty = (await getFacultiesWithOrganisations()).find((f) => f._id === values.faculty);
    return (
      <Container width="narrow">
        {crumbs}
        <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
          <BackLink href={localePath(locale, stepPath(previousStep("check") ?? "terms"))} locale={locale} />
          {flash?.errors.form ? (
            <NotificationBanner variant="warning" title={UI.brSubmitProblemTitle[locale]}>
              {errorMessage(flash.errors.form, locale)}
            </NotificationBanner>
          ) : null}
          <CheckAnswers locale={locale} values={values} inventory={ctx.inventory} facultyName={faculty ? pick(faculty.name, locale) : undefined} />
        </Stack>
      </Container>
    );
  }

  const items: ErrorSummaryItem[] = flash ? Object.entries(flash.errors).flatMap(([field, error]) => (field !== "form" ? [{ href: errorAnchor(field), message: errorMessage(error, locale) }] : [])) : [];
  const err = (field: string) => {
    const error = flash?.errors[field];
    return error ? errorMessage(error, locale) : undefined;
  };

  const fromCheck = from === "check";
  const previous = previousStep(step);
  const backHref = fromCheck ? localePath(locale, stepPath("check")) : previous ? localePath(locale, stepPath(previous)) : base;
  const title = stepTitle(step, locale);
  const chosenCategories = ctx.inventory.filter((c) => c.items.some((i) => values.items.includes(i.id)));
  const faculties = step === "details" && values.student === "yes" ? await getFacultiesWithOrganisations() : [];

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <BackLink href={backHref} locale={locale} />
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        <form action={saveStep} noValidate>
          <input type="hidden" name="step" value={step} />
          <input type="hidden" name="locale" value={locale} />
          {fromCheck ? <input type="hidden" name="from" value="check" /> : null}
          <Stack space={6}>
            {step === "dates" ? <DatesStep locale={locale} title={title} values={values} ctx={ctx} err={err} /> : null}
            {step === "items" ? <ItemsStep locale={locale} title={title} values={values} ctx={ctx} fromCheck={fromCheck} err={err} /> : null}
            {step === "quantities" ? <QuantitiesStep locale={locale} title={title} values={values} ctx={ctx} err={err} /> : null}

            {step === "event" ? (
              <>
                <Question>{title}</Question>
                <TextInput id="eventName" name="eventName" label={UI.brEventName[locale]} hint={UI.brEventNameHint[locale]} error={err("eventName")} defaultValue={values.eventName} maxLength={LIMITS.eventName} autoComplete="off" />
                <TextInput id="venue" name="venue" label={UI.brVenue[locale]} hint={UI.brVenueHint[locale]} error={err("venue")} defaultValue={values.venue} maxLength={LIMITS.venue} autoComplete="off" />
                <Textarea id="purpose" name="purpose" label={UI.brPurpose[locale]} hint={UI.brPurposeHint[locale]} error={err("purpose")} defaultValue={values.purpose} rows={5} autoComplete="off" />
              </>
            ) : null}

            {step === "group" ? (
              <>
                <Radios
                  id="borrower"
                  name="borrower"
                  legend={<Question>{title}</Question>}
                  defaultValue={values.borrower}
                  error={err("borrower")}
                  options={[
                    { value: "group", label: UI.brBorrowerGroup[locale], hint: UI.brBorrowerGroupHint[locale] },
                    { value: "personal", label: UI.brMyself[locale] },
                  ]}
                />
                <TextInput id="groupName" name="groupName" label={UI.brGroupName[locale]} hint={UI.brGroupNameHint[locale]} error={err("groupName")} defaultValue={values.groupName} maxLength={LIMITS.groupName} autoComplete="organization" />
              </>
            ) : null}

            {step === "student" ? (
              <Radios
                id="student"
                name="student"
                legend={<Question>{title}</Question>}
                hint={UI.brStudentHint[locale]}
                defaultValue={values.student}
                error={err("student")}
                options={[
                  { value: "yes", label: UI.brYes[locale] },
                  { value: "no", label: UI.brNo[locale] },
                ]}
              />
            ) : null}

            {step === "details" ? (
              <>
                <Question>{title}</Question>
                <TextInput id="name" name="name" label={UI.brName[locale]} error={err("name")} defaultValue={values.name} maxLength={LIMITS.name} autoComplete="name" />
                {values.student === "yes" ? (
                  <>
                    <TextInput id="studentId" name="studentId" label={UI.brStudentId[locale]} hint={UI.brStudentIdHint[locale]} error={err("studentId")} defaultValue={values.studentId} inputMode="numeric" maxLength={12} autoComplete="off" spellCheck={false} className="max-w-[14rem]" />
                    <Select
                      id="faculty"
                      name="faculty"
                      label={UI.brFaculty[locale]}
                      error={err("faculty")}
                      defaultValue={values.faculty}
                      options={[{ value: "", label: UI.brChooseFaculty[locale] }, ...faculties.map((f) => ({ value: f._id, label: pick(f.name, locale) }))]}
                    />
                  </>
                ) : (
                  <TextInput id="affiliation" name="affiliation" label={UI.brAffiliation[locale]} hint={UI.brAffiliationHint[locale]} error={err("affiliation")} defaultValue={values.affiliation} maxLength={LIMITS.affiliation} autoComplete="organization" />
                )}
              </>
            ) : null}

            {step === "contact" ? (
              <>
                <Question>{title}</Question>
                <TextInput id="phone" name="phone" type="tel" label={UI.brPhone[locale]} hint={UI.brPhoneHint[locale]} error={err("phone")} defaultValue={values.phone} inputMode="tel" autoComplete="tel" className="max-w-[16rem]" />
                <TextInput id="email" name="email" type="email" label={UI.brEmailOptional[locale]} hint={UI.brEmailHint[locale]} error={err("email")} defaultValue={values.email} autoComplete="email" spellCheck={false} />
              </>
            ) : null}

            {step === "terms" ? <TermsStep locale={locale} title={title} categories={chosenCategories} agreed={values.terms === "yes"} error={err("terms")} /> : null}

            <div>
              <Button type="submit">{fromCheck ? UI.brSaveAndCheck[locale] : UI.brContinue[locale]}</Button>
            </div>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}
