/**
 * Eat as a group. The whole group lives in the URL parameter `p`, so there is
 * no server storage and nothing to sign in to. The builder is a GET form that
 * works without JavaScript: a submit lands here with per person fields, and
 * this page redirects to the compact canonical URL, which renders the form
 * again from `p`. See components/domain/canteen/group/state.ts.
 */

import { redirect } from "next/navigation";

import { GroupBuilder } from "@/components/domain/canteen/group/GroupBuilder";
import { GroupResults } from "@/components/domain/canteen/group/GroupResults";
import { GROUP } from "@/components/domain/canteen/group/strings";
import {
  blankPerson,
  groupHref,
  isFormSubmission,
  readGroupState,
  stateFromForm,
} from "@/components/domain/canteen/group/state";
import { EmptyState, Heading, Stack } from "@/components/ui";
import { newSeed } from "@/lib/canteen/random";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getCanteenData } from "@/lib/sanity/queries";

import { PLAN_ROUTE } from "./mode";

export async function GroupMode({
  locale,
  query,
}: {
  locale: Locale;
  query: Record<string, string | string[] | undefined>;
}) {
  const path = `${localePath(locale, PLAN_ROUTE)}?mode=group`;

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

  if (data.dishes.length === 0) {
    return <EmptyState title={GROUP.emptyTitle[locale]}>{GROUP.emptyBody[locale]}</EmptyState>;
  }

  const people = state.people.length > 0 ? state.people : [blankPerson()];

  return (
    <Stack space={8}>
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
      </section>

      {state.people.length > 0 ? (
        <GroupResults locale={locale} data={data} state={state} path={path} now={now} />
      ) : null}
    </Stack>
  );
}
