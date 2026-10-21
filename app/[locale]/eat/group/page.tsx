/**
 * Eat as a group. The whole group lives in the URL parameter `p`, so there is
 * no server storage and nothing to sign in to. The builder is a GET form that
 * works without JavaScript: a submit lands here with per person fields, and
 * this page redirects to the compact canonical URL, which renders the form
 * again from `p`. See components/domain/canteen/group/state.ts.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EAT, t } from "@/components/domain/canteen";
import { GroupBuilder } from "@/components/domain/canteen/group/GroupBuilder";
import { GroupNotes, GroupResults } from "@/components/domain/canteen/group/GroupResults";
import { GROUP } from "@/components/domain/canteen/group/strings";
import {
  blankPerson,
  groupHref,
  isFormSubmission,
  readGroupState,
  stateFromForm,
} from "@/components/domain/canteen/group/state";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { newSeed } from "@/lib/canteen/random";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/group"),
    title: GROUP.pageTitle[locale],
    description: GROUP.pageIntro[locale],
  };
}

export default async function EatGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const path = localePath(locale, "/eat/group");
  const query = await searchParams;

  // A submitted builder form: turn it into the compact URL.
  if (isFormSubmission(query)) {
    const { state, hash } = stateFromForm(query);
    redirect(groupHref(path, state, hash));
  }

  const state = readGroupState(query);
  // "Random for all" needs a seed in the URL so a reload shows the same picks.
  if (state.strategy === "random" && state.people.length > 0 && !state.seed) {
    redirect(groupHref(path, { ...state, seed: newSeed() }, "results"));
  }

  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: GROUP.pageTitle[locale] },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{GROUP.pageTitle[locale]}</Heading>
      <p className="m-0 text-ink-600">{GROUP.pageIntro[locale]}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={GROUP.emptyTitle[locale]}>{GROUP.emptyBody[locale]}</EmptyState>
        </Stack>
      </Container>
    );
  }

  const people = state.people.length > 0 ? state.people : [blankPerson()];

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={8}>
        {header}

        <section aria-labelledby="how" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="how" className="m-0 text-xl">
            {GROUP.howTitle[locale]}
          </Heading>
          <ul className="m-0 grid list-none gap-[var(--space-4)] p-0 sm:grid-cols-2">
            <li className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
              <p className="m-0 font-semibold text-ink-900">{GROUP.passPhoneTitle[locale]}</p>
              <p className="m-0 mt-[var(--space-1)] text-ink-600">{GROUP.passPhoneBody[locale]}</p>
            </li>
            <li className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
              <p className="m-0 font-semibold text-ink-900">{GROUP.shareLinkTitle[locale]}</p>
              <p className="m-0 mt-[var(--space-1)] text-ink-600">{GROUP.shareLinkBody[locale]}</p>
            </li>
          </ul>
          <p className="m-0 text-sm text-ink-600">{GROUP.privacyNote[locale]}</p>
        </section>

        <section aria-label={GROUP.builderTitle[locale]} className="flex flex-col gap-[var(--space-4)]">
          <Heading level={2} id="builder" className="m-0 scroll-mt-[var(--space-8)] text-xl">
            {GROUP.builderTitle[locale]}
          </Heading>
          <GroupBuilder
            locale={locale}
            action={path}
            initialPeople={people}
            strategy={state.strategy}
            seed={state.seed}
          />
          <p className="m-0 text-sm text-ink-600">{GROUP.dietPreferenceNote[locale]}</p>
        </section>

        {state.people.length > 0 ? (
          <>
            <GroupResults locale={locale} data={data} state={state} path={path} now={now} />
            <GroupNotes locale={locale} />
          </>
        ) : null}
      </Stack>
    </Container>
  );
}
