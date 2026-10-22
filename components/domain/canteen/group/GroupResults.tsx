import Link from "next/link";
import type { CSSProperties } from "react";

import { CanteenMapWithList } from "@/components/domain/canteen/map";
import type { MapHighlight } from "@/components/domain/canteen/map";
import { Heading } from "@/components/ui/Heading";
import { cx } from "@/components/ui/cx";
import { commonCheckedOn, stallOf } from "@/lib/canteen/derive";
import {
  bindingConstraint,
  eachTheirOwn,
  oneStallForAll,
  type BindingConstraint,
  type GroupChange,
  type Person,
} from "@/lib/canteen/group";
import { defaultFilters } from "@/lib/canteen/params";
import { newSeed } from "@/lib/canteen/random";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/sanity/types";

import { CheckedOnNote } from "../CheckedOnNote";
import { DishCard } from "../DishCard";
import { PriceTag } from "../PriceTag";
import { AVOID_LABEL, DIET_SHORT_LABEL, label } from "../labels";
import { dishHref, stallHref } from "../links";
import { OtherName } from "../OtherName";
import { eat } from "../strings";
import { GROUP, group } from "./strings";
import {
  applyChange,
  bumpReroll,
  groupHref,
  personBadge,
  personLabel,
  type GroupState,
  type Strategy,
} from "./state";
import "./group.css";

interface GroupResultsProps {
  locale: Locale;
  data: CanteenData;
  state: GroupState;
  /** The page path, for example "/th/eat/plan?mode=group". */
  path: string;
  now: Date;
}

const DISHES_PER_PERSON = 4;
const TABS: ReadonlyArray<{ id: Strategy; label: keyof typeof GROUP }> = [
  { id: "one", label: "tabOne" },
  { id: "own", label: "tabOwn" },
  { id: "random", label: "tabRandom" },
];

/** A person's mark and name together, safe for any typed text because React escapes it. */
function PersonName({ person, index, locale }: { person: Person; index: number; locale: Locale }) {
  return (
    <span className="inline-flex items-center gap-[var(--space-2)]">
      <span
        aria-hidden="true"
        className="inline-flex h-[2rem] min-w-[2rem] items-center justify-center rounded-pill bg-welfare px-[var(--space-1)] text-sm font-semibold text-ink-on-fill"
      >
        {personBadge(person, index)}
      </span>
      <span dir="auto" className="min-w-0 break-words">
        {personLabel(person, index, (num) => group.person(num, locale))}
      </span>
    </span>
  );
}

/** The results: strategy links, then whichever strategy is chosen. A server component, no script needed. */
export function GroupResults({ locale, data, state, path, now }: GroupResultsProps) {
  const { people, strategy } = state;
  const name = (index: number) => personLabel(people[index]!, index, (num) => group.person(num, locale));
  const stallLabel = (stall: CanteenStall) => eat.stallFull(locale, stall.number, pick(stall.name, locale));
  const filters = defaultFilters();
  const freshSeed = newSeed();

  return (
    <section aria-labelledby="results" className="flex flex-col gap-[var(--space-6)]">
      <Heading level={2} id="results" className="m-0 scroll-mt-[var(--space-8)] text-xl">
        {GROUP.resultsTitle[locale]}
      </Heading>

      <nav aria-label={GROUP.strategyNav[locale]}>
        <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] border-b border-line p-0">
          {TABS.map((tab) => {
            const selected = tab.id === strategy;
            return (
              <li key={tab.id}>
                <Link
                  href={groupHref(path, { ...state, strategy: tab.id, seed: state.seed ?? (tab.id === "random" ? freshSeed : undefined) }, "results")}
                  aria-current={selected ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-[var(--target-min)] items-center border-b-[length:var(--border-width-thick)] px-[var(--space-3)] py-[var(--space-2)] text-base no-underline",
                    selected ? "border-action font-semibold text-action" : "border-transparent font-medium text-ink-600 hover:text-ink-900",
                  )}
                >
                  {GROUP[tab.label][locale]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {strategy === "one" ? renderOne() : renderOwn()}
    </section>
  );

  function renderOne() {
    const shared = oneStallForAll(data, people, { now });
    if (shared.length === 0) {
      return renderBinding(bindingConstraint(data, people, { now }));
    }
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        <p className="m-0 text-ink-600">{GROUP.oneIntro[locale]}</p>
        <p className="m-0 font-semibold text-ink-900">{group.stallsWork(shared.length, locale)}</p>
        <ol className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
          {shared.map((entry) => {
            // The most limited person: the first one with the fewest dishes here.
            const fewestIndex = entry.perPerson.findIndex((list) => list.length === entry.minChoices);
            return (
              <li key={entry.stall._id}>
                <article className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line bg-surface p-[var(--space-4)]">
                  <div className="flex flex-col gap-[var(--space-1)]">
                    <Heading level={3} className="m-0 text-lg">
                      <Link
                        href={stallHref(locale, entry.stall.slug.current, filters)}
                        className="inline-flex min-h-[var(--target-min)] items-center text-ink-900 hover:text-action"
                      >
                        {stallLabel(entry.stall)}
                      </Link>
                    </Heading>
                    <p className="m-0 text-sm text-ink-600">{group.fewest(name(fewestIndex), entry.minChoices, locale)}</p>
                  </div>
                  <ul className="m-0 grid list-none gap-[var(--space-4)] p-0 sm:grid-cols-2">
                    {entry.perPerson.map((dishes, index) => (
                      <li key={index} className="flex min-w-0 flex-col gap-[var(--space-2)]">
                        <Heading level={4} className="m-0 text-base">
                          <PersonName person={people[index]!} index={index} locale={locale} />
                        </Heading>
                        {renderDishes(dishes, entry.stall)}
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  function renderDishes(dishes: CanteenDish[], stall: CanteenStall) {
    const loc = locale;
    const shown = dishes.slice(0, DISHES_PER_PERSON);
    return (
      <>
        <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
          {shown.map((dish) => (
            <li key={dish._id} className="flex flex-col gap-[var(--space-1)]">
              <Link
                href={dishHref(loc, dish.slug.current, filters)}
                className="inline-flex min-h-[var(--target-min)] items-center font-medium"
              >
                {pick(dish.name, loc)}
              </Link>
              <OtherName name={dish.name} locale={loc} />
              <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={loc} />
            </li>
          ))}
        </ul>
        {dishes.length > shown.length ? (
          <p className="m-0 text-sm text-ink-600">
            <Link href={stallHref(loc, stall.slug.current, filters)}>{group.andMore(dishes.length - shown.length, loc)}</Link>
          </p>
        ) : null}
      </>
    );
  }

  function renderBinding(binding: BindingConstraint | null) {
    if (!binding) {
      return <p className="m-0 text-ink-900">{GROUP.noneWorkTitle[locale]}</p>;
    }
    const changes = binding.blockers.map((blocker) => ({ blocker, text: changeText(blocker.personIndex, blocker.change) }));
    const fixable = changes.every((entry) => entry.blocker.change !== null);
    const target = stallLabel(binding.stall);

    let fixed = people;
    if (fixable) {
      fixed = people.map((person, index) => {
        const blocker = binding.blockers.find((entry) => entry.personIndex === index);
        return blocker?.change ? applyChange(person, blocker.change) : person;
      });
    }

    return (
      <div className="flex flex-col gap-[var(--space-3)] rounded-panel border border-line bg-welfare-soft p-[var(--space-4)]">
        <Heading level={3} className="m-0 text-lg">
          {GROUP.bindingTitle[locale]}
        </Heading>
        <p className="m-0 text-ink-900">
          {group.closest(target, locale)}{" "}
          {group.blockedBy(binding.blockers.map((blocker) => name(blocker.personIndex)).join(locale === "th" ? " และ " : ", "), locale)}
        </p>
        {fixable ? (
          <>
            <p className="m-0 font-semibold text-ink-900">
              {group.ifChanges(
                changes.map((entry) => entry.text),
                target,
                locale,
              )}
            </p>
            <p className="m-0">
              <Link
                href={groupHref(path, { ...state, people: fixed, strategy: "one", rerolls: [] }, "results")}
                className="inline-flex min-h-[var(--target-min)] items-center font-medium"
              >
                {GROUP.applyChange[locale]}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="m-0 text-ink-900">{GROUP.noSmallFix[locale]}</p>
            <p className="m-0">
              <Link
                href={groupHref(path, { ...state, strategy: "own" }, "results")}
                className="inline-flex min-h-[var(--target-min)] items-center font-medium"
              >
                {GROUP.tryOwn[locale]}
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  function changeText(personIndex: number, change: GroupChange | null): string {
    const who = name(personIndex);
    if (!change) return who;
    switch (change.kind) {
      case "raiseBudget":
        return group.changeBudget(who, change.to, locale);
      case "dropDiet":
        return group.changeDropDiet(who, label(DIET_SHORT_LABEL, change.value, locale), locale);
      case "dropAvoid":
        return group.changeDropAvoid(who, label(AVOID_LABEL, change.value, locale), locale);
    }
  }

  function renderOwn() {
    const reveal = strategy === "random";
    const seed = state.seed ?? "start";
    const rerolls: Record<number, number> = {};
    state.rerolls.forEach((count, index) => {
      rerolls[index] = count;
    });
    const own = eachTheirOwn(data, people, { now, seed, rerolls });

    // One mark per stall, labelled with everyone who ate there.
    const byStall = new Map<string, { stall: CanteenStall; first: number; who: number[] }>();
    for (const entry of own.picks) {
      if (!entry.stall) continue;
      const existing = byStall.get(entry.stall._id);
      if (existing) existing.who.push(entry.personIndex);
      else byStall.set(entry.stall._id, { stall: entry.stall, first: entry.personIndex, who: [entry.personIndex] });
    }
    const highlights: MapHighlight[] = [...byStall.values()].map((entry) => ({
      stallId: entry.stall._id,
      order: entry.first + 1,
      label: entry.who.map((index) => `${personBadge(people[index]!, index)} ${name(index)}`).join(", "),
    }));
    const spinHref = groupHref(path, { ...state, strategy: "random", seed: newSeed(), rerolls: [] }, "results");
    const ownChecked = commonCheckedOn(own.picks.flatMap((entry) => (entry.dish ? [entry.dish] : [])));
    const zoneName = own.seating ? pick(own.seating.zone.label, locale) : null;

    return (
      <div className="flex flex-col gap-[var(--space-6)]">
        <p className="m-0 text-ink-600">{reveal ? GROUP.randomIntro[locale] : GROUP.ownIntro[locale]}</p>

        <div className="flex flex-col gap-[var(--space-3)]">
          <Heading level={3} className="m-0 text-lg">
            {GROUP.revealTitle[locale]}
          </Heading>
          {ownChecked ? <CheckedOnNote checkedOn={ownChecked} locale={locale} /> : null}
          <ol className={cx("m-0 grid list-none gap-[var(--space-4)] p-0 sm:grid-cols-2", reveal && "group-reveal")}>
            {own.picks.map((entry) => {
              const person = people[entry.personIndex]!;
              const count = state.rerolls[entry.personIndex] ?? 0;
              const nextRerolls = bumpReroll(state.rerolls, entry.personIndex, people.length);
              return (
                <li
                  key={entry.personIndex}
                  id={`pick-${entry.personIndex + 1}`}
                  style={{ "--reveal-index": entry.personIndex } as CSSProperties}
                  className="flex min-w-0 scroll-mt-[var(--space-8)] flex-col gap-[var(--space-2)]"
                >
                  <Heading level={4} className="m-0 text-base">
                    <PersonName person={person} index={entry.personIndex} locale={locale} />
                  </Heading>
                  {entry.dish ? (
                    <DishCard
                      dish={entry.dish}
                      stall={stallOf(data, entry.dish)}
                      locale={locale}
                      filters={filters}
                      headingLevel={5}
                      showFavourite={false}
                      hideChecked={entry.dish.checkedOn === ownChecked}
                    />
                  ) : (
                    <p className="m-0 rounded-panel border border-line bg-surface-alt p-[var(--space-4)] text-ink-900">
                      {group.nothingFits(name(entry.personIndex), locale)}
                    </p>
                  )}
                  {entry.dish ? (
                    <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-3)] text-sm text-ink-600">
                      <Link
                        href={groupHref(path, { ...state, rerolls: nextRerolls, seed }, `pick-${entry.personIndex + 1}`)}
                        className="inline-flex min-h-[var(--target-min)] items-center font-medium"
                      >
                        {group.reroll(locale)}
                        <span className="visually-hidden">{` ${name(entry.personIndex)}`}</span>
                      </Link>
                      {count > 0 ? <span>{group.rerollCount(count, locale)}</span> : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {reveal ? (
            <p className="m-0">
              <Link href={spinHref} className="inline-flex min-h-[var(--target-min)] items-center font-semibold">
                {GROUP.spinAgain[locale]}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-[var(--space-2)]">
          <Heading level={3} className="m-0 text-lg">
            {GROUP.seatingTitle[locale]}
          </Heading>
          {zoneName ? (
            <p className="m-0 font-semibold text-ink-900">
              <span dir="auto">{group.seatNear(zoneName, locale)}</span>
            </p>
          ) : (
            <p className="m-0 text-ink-600">{GROUP.noSeating[locale]}</p>
          )}
          <p className="m-0 text-sm text-ink-600">{GROUP.seatingNote[locale]}</p>
          {byStall.size > 0 ? (
            <>
              <Heading level={4} className="m-0 text-base">
                {GROUP.stallPicksTitle[locale]}
              </Heading>
              <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0 text-ink-900">
                {[...byStall.values()].map((entry) => (
                  <li key={entry.stall._id}>
                    {group.stallPick(
                      stallLabel(entry.stall),
                      entry.who.map((index) => `${personBadge(people[index]!, index)} ${name(index)}`).join(", "),
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {byStall.size > 0 ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <Heading level={3} className="m-0 text-lg">
              {GROUP.mapTitle[locale]}
            </Heading>
            <p className="m-0 text-sm text-ink-600">{GROUP.mapNote[locale]}</p>
            <CanteenMapWithList locale={locale} data={data} highlights={highlights} headingLevel={4} idPrefix="grp" />
          </div>
        ) : null}
      </div>
    );
  }
}

