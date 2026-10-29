/**
 * One question page of the complaint journey, rendered on the server. Nothing
 * here needs JavaScript: each page is a plain form that posts to a Server
 * Action (./actions.ts), which redirects to the next page or back here with
 * errors.
 *
 * The draft comes from the httpOnly cookie. With no draft (never started, or
 * expired after two hours) the reader goes back to the start page.
 */

import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Checkboxes, Container, ErrorMessage, ErrorSummary, Heading, InsetText, NotificationBanner, Radios, Stack, Textarea, TextInput, type ErrorSummaryItem } from "@/components/ui";
import { listCategories } from "@/lib/complaints/categories";
import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_FILES } from "@/lib/complaints/constants";
import { readJourneyToken } from "@/lib/complaints/public/cookies";
import { isEvidenceStorageAvailable, listJourneyFiles } from "@/lib/complaints/public/evidence";
import { isStep, JOURNEY_BASE, NO_PROGRAMME, previousStep, stepPath, type DraftValues } from "@/lib/complaints/public/steps";
import { loadJourney, saveJourney, type JourneyData } from "@/lib/complaints/public/store";
import { facultyChoices, firstProblem, hasProgrammes, misroute } from "@/lib/complaints/public/validate";
import { getFacultiesWithOrganisations } from "@/lib/content";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getStorage } from "@/lib/storage";
import { removeEvidence, saveStep, uploadEvidence } from "./actions";
import { BackLink } from "./BackLink";
import { CheckAnswers } from "./CheckAnswers";
import { Confirmation } from "./Confirmation";
import { errorAnchor, stepTitle } from "./copy";
import { Signpost } from "./Signpost";
import { Unavailable } from "./Unavailable";
import { Urgent } from "./Urgent";

interface JourneyStepProps {
  locale: string;
  step: string;
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
        { label: UI.cpServiceName[locale], path: JOURNEY_BASE },
        { label: stepTitle(step, locale) },
      ]}
    />
  );
  if (!isDatabaseConfigured() || !isPiiAvailable()) {
    return <Unavailable locale={locale} title={UI.cpServiceName[locale]} breadcrumbs={crumbs} />;
  }

  const db = getDb();
  const loaded = await loadJourney(db, await readJourneyToken());
  if (!loaded) redirect(`${base}?expired=1`);
  const data: JourneyData = loaded.data;

  // Once sent, the only page that makes sense is the confirmation.
  if (data.result && step !== "confirmation") redirect(localePath(locale, stepPath("confirmation")));

  if (step === "confirmation") {
    if (!data.result) redirect(base);
    return <Confirmation locale={locale} result={data.result} email={email} crumbs={crumbs} />;
  }

  // Show the errors from the last rejected post once, then forget them.
  const flash = data.flash && data.flash.step === step ? data.flash : undefined;
  if (data.flash) await saveJourney(db, loaded.id, { ...data, flash: undefined });

  const categories = await listCategories(db, { activeOnly: true });
  const identity = data.values.identity;
  const faculties = await getFacultiesWithOrganisations();
  const choices = facultyChoices(faculties);
  const programmes = hasProgrammes(choices, data.values.faculty);
  const faculty = faculties.find((f) => f.slug === data.values.faculty) ?? null;

  // Only the pages on this person's route, and none before the questions ahead of it are answered.
  const elsewhere = misroute(step, data.values, categories.map((c) => c.key), choices);
  if (elsewhere) redirect(localePath(locale, stepPath(elsewhere)));

  // A page for a stage that does not apply (contact, for an anonymous complaint) is skipped.
  if (step === "contact" && identity === "anonymous") redirect(localePath(locale, stepPath("check")));

  if (step === "check") {
    const problem = firstProblem(data.values, categories.map((c) => c.key));
    if (problem) {
      await saveJourney(db, loaded.id, { ...data, flash: { step: problem.step, errors: problem.errors } });
      redirect(localePath(locale, stepPath(problem.step)));
    }
    const files = await listJourneyFiles(db, loaded.id);
    const category = categories.find((c) => c.key === data.values.category);
    return (
      <Container width="narrow">
        {crumbs}
        <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
          <BackLink href={localePath(locale, stepPath(previousStep(data.values, "check") ?? "identity"))} locale={locale} />
          {flash?.errors.form ? (
            <NotificationBanner variant="warning" title={UI.cpSubmitProblemTitle[locale]}>
              {UI[flash.errors.form][locale]}
            </NotificationBanner>
          ) : null}
          <CheckAnswers locale={locale} values={data.values} category={category ? { name: pick({ th: category.nameTh, en: category.nameEn }, locale), restricted: category.restricted } : undefined} fileNames={files.map((f) => f.name ?? UI.cpFileUnnamed[locale])} />
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
  const previous = previousStep(data.values, step, programmes);
  const backHref = fromCheck ? localePath(locale, stepPath("check")) : previous ? localePath(locale, stepPath(previous)) : base;
  const title = stepTitle(step, locale);
  const values = data.values;

  if (step === "urgent") return <Urgent locale={locale} crumbs={crumbs} backHref={backHref} />;
  if (step === "signpost") return <Signpost locale={locale} crumbs={crumbs} backHref={backHref} values={values} faculty={faculty} />;

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <BackLink href={backHref} locale={locale} />
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} />
        {step === "evidence" ? (
          <EvidenceStep locale={locale} title={title} fromCheck={fromCheck} journeyId={loaded.id} err={err} />
        ) : (
          <form action={saveStep} noValidate>
            <input type="hidden" name="step" value={step} />
            <input type="hidden" name="locale" value={locale} />
            {fromCheck ? <input type="hidden" name="from" value="check" /> : null}
            <Stack space={6}>
              {step === "emergency" ? (
                <Radios
                  id="emergency"
                  name="emergency"
                  legend={<Question>{title}</Question>}
                  defaultValue={values.emergency}
                  error={err("emergency")}
                  options={[
                    { value: "yes", label: UI.cpEmergencyYes[locale], hint: UI.cpEmergencyYesHint[locale] },
                    { value: "no", label: UI.cpEmergencyNo[locale], hint: UI.cpEmergencyNoHint[locale] },
                  ]}
                />
              ) : null}

              {step === "level" ? (
                <Radios
                  id="level"
                  name="level"
                  legend={<Question>{title}</Question>}
                  hint={UI.cpLevelHint[locale]}
                  defaultValue={values.level}
                  error={err("level")}
                  options={[
                    { value: "course", label: UI.cpLevelCourse[locale], hint: UI.cpLevelCourseHint[locale] },
                    { value: "faculty", label: UI.cpLevelFaculty[locale], hint: UI.cpLevelFacultyHint[locale] },
                    { value: "university", label: UI.cpLevelUniversity[locale], hint: UI.cpLevelUniversityHint[locale] },
                    { value: "unsure", label: UI.cpLevelUnsure[locale], hint: UI.cpLevelUnsureHint[locale] },
                  ]}
                />
              ) : null}

              {step === "faculty" ? (
                <Radios
                  id="faculty"
                  name="faculty"
                  legend={<Question>{title}</Question>}
                  hint={(values.level === "course" ? UI.cpFacultyHintCourse : UI.cpFacultyHintFaculty)[locale]}
                  defaultValue={values.faculty}
                  error={err("faculty")}
                  options={faculties.map((f) => ({ value: f.slug, label: pick(f.name, locale) }))}
                />
              ) : null}

              {step === "lecturer" ? (
                <Radios
                  id="lecturer"
                  name="lecturer"
                  legend={<Question>{title}</Question>}
                  defaultValue={values.lecturer}
                  error={err("lecturer")}
                  options={[
                    { value: "yes", label: UI.cpLecturerYes[locale] },
                    { value: "harassment", label: UI.cpLecturerHarassment[locale] },
                    { value: "other", label: UI.cpLecturerOther[locale], hint: UI.cpLecturerOtherHint[locale] },
                  ]}
                />
              ) : null}

              {step === "programme" ? (
                <Radios
                  id="programme"
                  name="programme"
                  legend={<Question>{title}</Question>}
                  hint={UI.cpProgrammeHint[locale]}
                  defaultValue={values.programme}
                  error={err("programme")}
                  options={[
                    ...(faculty?.programmes ?? []).map((p) => ({ value: p._id, label: pick(p.programme ?? p.name, locale) })),
                    { value: NO_PROGRAMME, label: UI.cpProgrammeNone[locale] },
                  ]}
                />
              ) : null}

              {step === "identity" ? (
                <Radios
                  id="identity"
                  name="identity"
                  legend={<Question>{title}</Question>}
                  hint={UI.cpIdentityHint[locale]}
                  defaultValue={values.identity}
                  error={err("identity")}
                  options={[
                    { value: "named", label: UI.cpIdentityNamed[locale], hint: UI.cpIdentityNamedHint[locale] },
                    { value: "pseudonymous", label: UI.cpIdentityPseudonymous[locale], hint: UI.cpIdentityPseudonymousHint[locale] },
                    { value: "anonymous", label: UI.cpIdentityAnonymous[locale], hint: UI.cpIdentityAnonymousHint[locale] },
                  ]}
                />
              ) : null}

              {step === "category" ? (
                <Radios
                  id="category"
                  name="category"
                  legend={<Question>{title}</Question>}
                  hint={UI.cpCategoryHint[locale]}
                  defaultValue={values.category}
                  error={err("category")}
                  options={categories.map((c) => ({ value: c.key, label: pick({ th: c.nameTh, en: c.nameEn }, locale), hint: pick({ th: c.hintTh, en: c.hintEn }, locale) || undefined }))}
                />
              ) : null}

              {step === "describe" ? (
                <>
                  <Question>{title}</Question>
                  <InsetText>
                    <p className="m-0">{UI.cpDescribeGuidance[locale]}</p>
                  </InsetText>
                  <Textarea id="description" name="description" label={UI.cpDescriptionLabel[locale]} hint={UI.cpDescriptionHint[locale]} error={err("description")} defaultValue={values.description} rows={8} autoComplete="off" />
                </>
              ) : null}

              {step === "when" ? (
                <>
                  <Question>{title}</Question>
                  <p className="m-0 text-ink-600">{UI.cpOptional[locale]}</p>
                  <TextInput id="when" name="when" label={UI.cpWhenLabel[locale]} hint={UI.cpWhenHint[locale]} error={err("when")} defaultValue={values.when} autoComplete="off" />
                  <TextInput id="where" name="where" label={UI.cpWhereLabel[locale]} hint={UI.cpWhereHint[locale]} error={err("where")} defaultValue={values.where} autoComplete="off" />
                </>
              ) : null}

              {step === "remedy" ? (
                <>
                  <Question>{title}</Question>
                  <p className="m-0 text-ink-600">{UI.cpOptional[locale]}</p>
                  <Textarea id="remedy" name="remedy" label={UI.cpRemedyLabel[locale]} hint={UI.cpRemedyHint[locale]} error={err("remedy")} defaultValue={values.remedy} rows={5} autoComplete="off" />
                </>
              ) : null}

              {step === "contact" ? <ContactFields locale={locale} title={title} values={values} err={err} /> : null}

              <div>
                <Button type="submit">{fromCheck ? UI.cpSaveAndCheck[locale] : UI.cpContinue[locale]}</Button>
              </div>
            </Stack>
          </form>
        )}
      </Stack>
    </Container>
  );
}

type Err = (field: string) => string | undefined;

async function EvidenceStep({ locale, title, fromCheck, journeyId, err }: { locale: Locale; title: string; fromCheck: boolean; journeyId: string; err: Err }) {
  const db = getDb();
  const available = isEvidenceStorageAvailable(getStorage);
  const files = await listJourneyFiles(db, journeyId);
  const full = files.length >= MAX_EVIDENCE_FILES;
  const megabytes = Math.floor(MAX_EVIDENCE_BYTES / (1024 * 1024));
  return (
    <Stack space={6}>
      <Stack space={2}>
        <Question>{title}</Question>
        <p className="m-0 text-ink-600">{UI.cpOptional[locale]}</p>
      </Stack>
      {available ? (
        <>
          <p className="m-0 text-ink-900">{UI.cpEvidenceIntro[locale].replace("{count}", String(MAX_EVIDENCE_FILES)).replace("{size}", String(megabytes))}</p>
          {files.length > 0 ? (
            <section aria-labelledby="cp-files">
              <Heading level={2} id="cp-files">
                {UI.cpEvidenceAdded[locale]}
              </Heading>
              <ul className="m-0 mt-[var(--space-2)] flex list-none flex-col gap-[var(--space-3)] p-0">
                {files.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center gap-[var(--space-3)]">
                    <span className="break-all">{file.name ?? UI.cpFileUnnamed[locale]}</span>
                    <form action={removeEvidence} noValidate>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="file" value={file.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        {UI.cpFileRemove[locale]}
                        <span className="visually-hidden"> {file.name ?? UI.cpFileUnnamed[locale]}</span>
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {!full ? (
            <form action={uploadEvidence} encType="multipart/form-data" noValidate>
              <input type="hidden" name="locale" value={locale} />
              <Stack space={3}>
                <div className="flex flex-col gap-[var(--space-1)]">
                  <label htmlFor="evidence" className="text-base font-medium text-ink-900">
                    {UI.cpFileLabel[locale]}
                  </label>
                  <p id="evidence-hint" className="m-0 text-sm text-ink-600">
                    {UI.cpFileHint[locale].replace("{size}", String(megabytes))}
                  </p>
                  {err("evidence") ? <ErrorMessage id="evidence-error">{err("evidence")}</ErrorMessage> : null}
                  <input id="evidence" type="file" name="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" aria-describedby={err("evidence") ? "evidence-hint evidence-error" : "evidence-hint"} />
                </div>
                <div>
                  <Button type="submit" variant="secondary">
                    {UI.cpFileUpload[locale]}
                  </Button>
                </div>
              </Stack>
            </form>
          ) : (
            <p className="m-0 text-ink-600">{UI.cpEvidenceFull[locale]}</p>
          )}
        </>
      ) : (
        <NotificationBanner variant="info" title={UI.cpEvidenceUnavailableTitle[locale]}>
          {UI.cpEvidenceUnavailable[locale]}
        </NotificationBanner>
      )}
      <form action={saveStep} noValidate>
        <input type="hidden" name="step" value="evidence" />
        <input type="hidden" name="locale" value={locale} />
        {fromCheck ? <input type="hidden" name="from" value="check" /> : null}
        <Button type="submit">{fromCheck ? UI.cpSaveAndCheck[locale] : files.length > 0 ? UI.cpContinue[locale] : UI.cpContinueWithout[locale]}</Button>
      </form>
    </Stack>
  );
}

function ContactFields({ locale, title, values, err }: { locale: Locale; title: string; values: DraftValues; err: Err }) {
  const pseudonymous = values.identity === "pseudonymous";
  return (
    <>
      <Stack space={2}>
        <Question>{title}</Question>
        <p className="m-0 text-ink-600">{(pseudonymous ? UI.cpContactHintPseudonymous : UI.cpContactHintNamed)[locale]}</p>
      </Stack>
      <TextInput
        id="name"
        name="name"
        label={(pseudonymous ? UI.cpNameLabelPseudonymous : UI.cpNameLabel)[locale]}
        hint={pseudonymous ? UI.cpNameHintPseudonymous[locale] : undefined}
        error={err("name")}
        defaultValue={values.name}
        autoComplete="name"
      />
      <TextInput id="email" name="email" type="email" label={UI.cpEmailLabel[locale]} hint={UI.cpEmailHint[locale]} error={err("email")} defaultValue={values.email} autoComplete="email" spellCheck={false} />
      <TextInput id="phone" name="phone" type="tel" label={UI.cpPhoneLabel[locale]} error={err("phone")} defaultValue={values.phone} autoComplete="tel" />
      <TextInput id="lineId" name="lineId" label={UI.cpLineLabel[locale]} error={err("lineId")} defaultValue={values.lineId} autoComplete="off" spellCheck={false} />
      <Radios
        id="preferred"
        name="preferred"
        legend={UI.cpPreferredLegend[locale]}
        hint={UI.cpPreferredHint[locale]}
        error={err("preferred")}
        defaultValue={values.preferred}
        options={[
          { value: "email", label: UI.cpPreferredEmail[locale] },
          { value: "phone", label: UI.cpPreferredPhone[locale] },
          { value: "line", label: UI.cpPreferredLine[locale] },
        ]}
      />
      <Checkboxes
        id="consent"
        name="consent"
        legend={UI.cpConsentLegend[locale]}
        error={err("consent")}
        defaultValue={values.consent === "yes" ? ["yes"] : []}
        options={[{ value: "yes", label: UI.cpConsent[locale] }]}
      />
    </>
  );
}
