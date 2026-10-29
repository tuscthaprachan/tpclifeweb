/**
 * Eat as a group. The whole group lives in the URL parameter `p`, so there is
 * no server storage and nothing to sign in to. The builder is a GET form that
 * works without JavaScript: a submit lands here with per person fields, and
 * the request is sent on to the compact canonical URL (see `planTarget`),
 * which renders the form again from `p`. See components/domain/canteen/group/state.ts.
 *
 * `query` is the group the results are for. With JavaScript the builder edits
 * the address bar as it goes, but the results only follow when "Show results"
 * is pressed, so the page that holds this keeps the two apart.
 */

import { GroupBuilder } from "@/components/domain/canteen/group/GroupBuilder";
import { GroupResults } from "@/components/domain/canteen/group/GroupResults";
import { GROUP } from "@/components/domain/canteen/group/strings";
import { blankPerson, encodeGroupKey, readGroupState } from "@/components/domain/canteen/group/state";
import { Details, EmptyState, Heading, Stack } from "@/components/ui";
import type { RawParams } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { PLAN_ROUTE } from "./mode";

export function GroupMode({
  locale,
  data,
  query,
  now,
  freshSeed,
  onEdit,
  onShow,
}: {
  locale: Locale;
  data: CanteenData;
  query: RawParams;
  now: Date;
  /** A fresh seed for the links that start a random pick. */
  freshSeed: string;
  /** The builder changed the address bar to this query. */
  onEdit: (search: string) => void;
  /** "Show results" was pressed: the results are for this address. */
  onShow: (href: string) => void;
}) {
  const path = `${localePath(locale, PLAN_ROUTE)}?mode=group`;
  const state = readGroupState(query);

  if (data.dishes.length === 0) {
    return <EmptyState title={GROUP.emptyTitle[locale]}>{GROUP.emptyBody[locale]}</EmptyState>;
  }

  const people = state.people.length > 0 ? state.people : [blankPerson()];

  return (
    <Stack space={8}>
      <section aria-label={GROUP.builderTitle[locale]} className="flex flex-col gap-[var(--space-4)]">
        <Heading level={2} id="builder" className="m-0 scroll-mt-[var(--space-8)] text-xl">
          {GROUP.builderTitle[locale]}
        </Heading>
        <GroupBuilder
          key={encodeGroupKey(state)}
          locale={locale}
          action={path}
          initialPeople={people}
          strategy={state.strategy}
          seed={state.seed}
          showShare={state.people.length > 0}
          onEdit={onEdit}
          onShow={onShow}
        />
        <p className="m-0 text-sm text-ink-600">{GROUP.privacyNote[locale]}</p>
        <Details summary={GROUP.howTitle[locale]}>
          <ul className="m-0 grid list-none gap-[var(--space-4)] p-0 sm:grid-cols-2">
            <li>
              <p className="m-0 font-semibold text-ink-900">{GROUP.passPhoneTitle[locale]}</p>
              <p className="m-0 mt-[var(--space-1)] text-ink-600">{GROUP.passPhoneBody[locale]}</p>
            </li>
            <li>
              <p className="m-0 font-semibold text-ink-900">{GROUP.shareLinkTitle[locale]}</p>
              <p className="m-0 mt-[var(--space-1)] text-ink-600">{GROUP.shareLinkBody[locale]}</p>
            </li>
          </ul>
        </Details>
      </section>

      {state.people.length > 0 ? (
        <GroupResults locale={locale} data={data} state={state} path={path} now={now} freshSeed={freshSeed} />
      ) : null}
    </Stack>
  );
}
