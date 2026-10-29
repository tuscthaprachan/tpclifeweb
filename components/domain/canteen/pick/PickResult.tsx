import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Details } from "@/components/ui/Details";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import type { MealCombo } from "@/lib/canteen/combos";
import { canonicalOf } from "@/lib/canteen/derive";
import type { PickResult as PickOutcome, Relaxation } from "@/lib/canteen/random";
import type { CanteenFilters } from "@/lib/canteen/params";
import { OTHER_LOCALE, pick as localised, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/content/types";

import { DietTags } from "../DietTag";
import { HowToSay } from "../HowToSay";
import { DiceIcon, DishTypeIcon, PinIcon } from "../icons";
import "../fun.css";
import { dishDietTags } from "../diet";
import { TYPE_LABEL } from "../labels";
import { dishHref, mapHref, stallHref } from "../links";
import { OtherName } from "../OtherName";
import { PriceTag } from "../PriceTag";
import { EAT, eat, t } from "../strings";
import { EatThisButton } from "./EatThisButton";
import { pickHref, type PickParams } from "./helpers";
import { ShareButton } from "./ShareButton";
import { StallMiniMap } from "./StallMiniMap";
import { PICK, pickText } from "./strings";

export interface MealPickView {
  combo: MealCombo;
  budget: number;
  /** The vetoes were dropped because every combination contained a vetoed dish. */
  vetoRelaxed: boolean;
}

export interface PickResultProps {
  locale: Locale;
  data: CanteenData;
  filters: CanteenFilters;
  /** The URL state this result belongs to. `seed` must be set. */
  params: PickParams;
  /** A fresh seed for the links that spin again. Made by the page, so this component stays pure. */
  nextSeed: string;
  /** The result of `pick()`, for the dish and stall modes. */
  outcome?: PickOutcome;
  /** The result for the meal mode. */
  meal?: MealPickView;
  /** Stall mode: the dishes at the picked stall that match the filters. */
  stallDishes?: readonly CanteenDish[];
}

const CHIP =
  "inline-flex min-h-[var(--target-min)] items-center rounded-pill border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-1)] text-base font-medium text-ink-900 no-underline hover:bg-surface-alt";

const RELAXED_TEXT: Record<Relaxation, keyof typeof PICK> = {
  repeat: "relaxedRepeat",
  lock: "relaxedLock",
  veto: "relaxedVeto",
};

/**
 * The result card of "Decide for me", for all three modes. Pure: it is
 * rendered with the rest of the page and again by the client island when the
 * device history changes the pick. Everything it links to is a plain link
 * with a seed in it, so every action works without JavaScript. The only
 * client parts are "Go with this" (logs to the device) and "Share". One filled
 * button per card: the accept action. Spinning again is outlined, vetoing is a
 * text link, and the rest sits in "More options".
 */
export function PickResult(props: PickResultProps) {
  const { params } = props;
  if (params.mode === "meal" && props.meal) return <MealCard {...props} meal={props.meal} />;
  if (props.outcome?.dish && props.outcome.stall) {
    return params.mode === "stall" ? (
      <StallCard {...props} outcome={props.outcome} />
    ) : (
      <DishCard {...props} outcome={props.outcome} />
    );
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

function Relaxed({ locale, relaxed }: { locale: Locale; relaxed: Relaxation[] | null }) {
  if (!relaxed || relaxed.length === 0) return null;
  return (
    <InsetText>
      <p className="m-0 font-medium">{PICK.relaxedTitle[locale]}</p>
      <ul className="m-0 mt-[var(--space-1)] list-disc pl-[var(--space-6)] text-base">
        {relaxed.map((item) => (
          <li key={item}>{PICK[RELAXED_TEXT[item]][locale]}</li>
        ))}
      </ul>
      <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{PICK.relaxedFilters[locale]}</p>
    </InsetText>
  );
}

function Card({ labelledBy, children }: { labelledBy: string; children: React.ReactNode }) {
  return (
    <article aria-labelledby={labelledBy} className="rounded-panel border border-line bg-surface p-[var(--space-4)] sm:p-[var(--space-6)]">
      <div className="flex flex-col gap-[var(--space-4)] md:gap-[var(--space-6)]">{children}</div>
    </article>
  );
}

function StallLine({ locale, stall, filters }: { locale: Locale; stall: CanteenStall; filters: CanteenFilters }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start gap-[var(--space-1)] text-lg font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
        <PinIcon className="mt-[calc((1lh-18px)/2)] shrink-0 text-ink-600" size={18} />
        <span className="min-w-0 flex-1">{eat.stallFull(locale, stall.number, localised(stall.name, locale))}</span>
        <ChevronDownIcon className="mt-[calc((1lh-16px)/2)] shrink-0 text-ink-600 transition-transform duration-[var(--motion-state)] ease-[var(--easing)] group-open:rotate-180" />
      </summary>
      <div className="mt-[var(--space-2)] flex flex-col gap-[var(--space-2)] pl-[calc(18px+var(--space-1))]">
        <p className="m-0 text-base text-ink-900">{stall.wayfinding ? localised(stall.wayfinding, locale) : t(EAT.noWayfinding, locale)}</p>
        <p className="m-0 text-base">
          <Link href={stallHref(locale, stall.slug.current, filters)}>{PICK.seeStall[locale]}</Link>
        </p>
      </div>
    </details>
  );
}

function Actions({
  locale,
  filters,
  params,
  nextSeed,
  vetoSlugs,
  eat: eatNode,
  locks,
}: {
  locale: Locale;
  filters: CanteenFilters;
  params: PickParams;
  nextSeed: string;
  vetoSlugs: string[];
  eat: React.ReactNode;
  locks?: React.ReactNode;
}) {
  const not = [...params.not.filter((slug) => !vetoSlugs.includes(slug)), ...vetoSlugs];
  return (
    <div className="flex flex-col gap-[var(--space-4)]" role="group" aria-label={PICK.actionsLabel[locale]}>
      {eatNode}
      <div className="flex flex-wrap items-center gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
        <Button variant="secondary" href={pickHref(locale, filters, params, { seed: nextSeed, lock: [], of: undefined })} className="fun-spin">
          <span aria-hidden="true" className="fun-die">
            <DiceIcon size={22} />
          </span>
          {PICK.spinAgain[locale]}
        </Button>
        <Button variant="quiet" href={pickHref(locale, filters, params, { seed: nextSeed, not })} className="px-0!">
          {PICK.notThis[locale]}
        </Button>
      </div>
      <Details summary={PICK.moreOptions[locale]}>
        <div className="flex flex-col gap-[var(--space-4)]">
          {locks}
          <ShareButton locale={locale} href={pickHref(locale, filters, params)} id="pick-share" />
        </div>
      </Details>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dish
 * ------------------------------------------------------------------ */

function DishCard({ locale, data, filters, params, nextSeed, outcome }: PickResultProps & { outcome: PickOutcome }) {
  const dish = outcome.dish!;
  const stall = outcome.stall!;
  const canonical = canonicalOf(data, dish);
  const other = OTHER_LOCALE[locale];
  const name = localised(dish.name, locale);
  const otherName = localised(dish.name, other);
  const tags = dishDietTags(dish, stall);
  const typeName = TYPE_LABEL[dish.type][locale];

  const lockLink = (label: string, lock: PickParams["lock"]) => (
    <li key={label}>
      <Link href={pickHref(locale, filters, params, { seed: nextSeed, lock, of: dish.slug.current })} className={CHIP}>
        {label}
      </Link>
    </li>
  );

  return (
    <Card labelledBy="pick-result-title">
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="m-0 inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600">
          <DishTypeIcon type={dish.type} />
          {typeName}
        </p>
        <Heading level={2} id="pick-result-title" className="m-0 text-2xl">
          <Link href={dishHref(locale, dish.slug.current, filters)} className="text-ink-900 no-underline hover:underline">
            {name}
          </Link>
        </Heading>
        {otherName && otherName !== name ? (
          <p lang={other} className="m-0 text-base text-ink-600">
            {otherName}
          </p>
        ) : null}
        <HowToSay dish={dish} locale={locale} className="text-base" />
      </div>

      <div className="grid gap-[var(--space-4)] md:grid-cols-2 md:gap-[var(--space-6)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-4)]">
          <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={locale} hideChecked />
          <DietTags tags={tags} locale={locale} />
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--space-3)]">
          <StallLine locale={locale} stall={stall} filters={filters} />
          <StallMiniMap locale={locale} data={data} stalls={[stall]} filters={filters} idPrefix="pickmap" />
        </div>
      </div>

      <Relaxed locale={locale} relaxed={outcome.relaxed} />

      <Actions
        locale={locale}
        filters={filters}
        params={params}
        nextSeed={nextSeed}
        vetoSlugs={[dish.slug.current]}
        eat={
          <EatThisButton
            key={`${params.seed}-${dish.slug.current}`}
            locale={locale}
            items={[{ slug: dish.slug.current, price: dish.price }]}
            href={stallHref(locale, stall.slug.current, filters)}
          />
        }
        locks={
          <div className="flex flex-col gap-[var(--space-2)]">
            <p className="m-0 text-base font-medium text-ink-900">{PICK.lockLabel[locale]}</p>
            <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
              {lockLink(PICK.keepStall[locale], ["stall"])}
              {lockLink(pickText.keepType(locale, typeName), ["type"])}
              {canonical ? lockLink(PICK.keepCanonical[locale], ["canonical"]) : null}
            </ul>
          </div>
        }
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Stall
 * ------------------------------------------------------------------ */

function StallCard({ locale, data, filters, params, nextSeed, outcome, stallDishes = [] }: PickResultProps & { outcome: PickOutcome }) {
  const stall = outcome.stall!;
  const name = localised(stall.name, locale);

  return (
    <Card labelledBy="pick-result-title">
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="m-0 text-sm text-ink-600">{PICK.stallPickTitle[locale]}</p>
        <Heading level={2} id="pick-result-title" className="m-0 text-2xl">
          <Link href={stallHref(locale, stall.slug.current, filters)} className="text-ink-900 no-underline hover:underline">
            {name}
          </Link>
        </Heading>
        <p className="m-0 text-lg text-ink-600">{eat.stallNumber(locale, stall.number)}</p>
      </div>

      <div className="grid gap-[var(--space-4)] md:grid-cols-2 md:gap-[var(--space-6)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-4)]">
          <div className="flex flex-col gap-[var(--space-2)]">
            <p className="m-0 text-base font-medium text-ink-600">{PICK.stallDishes[locale]}</p>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
              {stallDishes.slice(0, 5).map((dish) => (
                <li key={dish._id} className="flex flex-col gap-[var(--space-1)]">
                  <Link href={dishHref(locale, dish.slug.current, filters)} className="font-medium">
                    {localised(dish.name, locale)}
                  </Link>
                  <OtherName name={dish.name} locale={locale} />
                  <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={locale} hideChecked />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--space-3)]">
          <StallLine locale={locale} stall={stall} filters={filters} />
          <StallMiniMap locale={locale} data={data} stalls={[stall]} filters={filters} idPrefix="pickmap" />
        </div>
      </div>

      <Relaxed locale={locale} relaxed={outcome.relaxed} />

      <Actions
        locale={locale}
        filters={filters}
        params={params}
        nextSeed={nextSeed}
        vetoSlugs={[stall.slug.current]}
        eat={
          <Button href={stallHref(locale, stall.slug.current, filters)} className="fun-roll w-full sm:w-auto">
            {PICK.seeStall[locale]}
          </Button>
        }
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Meal
 * ------------------------------------------------------------------ */

function MealCard({ locale, data, filters, params, nextSeed, meal }: PickResultProps & { meal: MealPickView }) {
  const { combo, budget } = meal;
  const names = combo.items.map((dish) => localised(dish.name, locale));
  const slugs = combo.stalls.map((stall) => stall.slug.current).join(",");
  const relaxed: Relaxation[] | null = meal.vetoRelaxed ? ["veto"] : null;

  return (
    <Card labelledBy="pick-result-title">
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="m-0 text-sm text-ink-600">{PICK.mealPickTitle[locale]}</p>
        <Heading level={2} id="pick-result-title" className="m-0 text-2xl">
          {pickText.mealTotal(locale, combo.total, combo.change, budget)}
        </Heading>
      </div>

      <div className="grid gap-[var(--space-4)] md:grid-cols-2 md:gap-[var(--space-6)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-4)]">
          <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
            {combo.items.map((dish, position) => {
              const stall = data.stalls.find((item) => item._id === dish.stallId);
              return (
                <li key={dish._id} className="flex flex-col gap-[var(--space-1)]">
                  <Link href={dishHref(locale, dish.slug.current, filters)} className="text-lg font-medium">
                    {names[position]}
                  </Link>
                  <OtherName name={dish.name} locale={locale} />
                  {stall ? (
                    <p className="m-0 text-sm text-ink-600">
                      {PICK.alsoWord[locale]} {eat.stallFull(locale, stall.number, localised(stall.name, locale))}
                    </p>
                  ) : null}
                  <PriceTag price={dish.price} variants={dish.variants} checkedOn={dish.checkedOn} locale={locale} hideChecked />
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex min-w-0 flex-col gap-[var(--space-3)]">
          <p className="m-0 text-base font-medium text-ink-600">{PICK.mealWalk[locale]}</p>
          <ol className="m-0 flex list-decimal flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
            {combo.stalls.map((stall) => (
              <li key={stall._id} className="text-ink-900">
                <Link href={stallHref(locale, stall.slug.current, filters)}>{eat.stallFull(locale, stall.number, localised(stall.name, locale))}</Link>
                {stall.wayfinding ? <span className="block text-sm text-ink-600">{localised(stall.wayfinding, locale)}</span> : null}
              </li>
            ))}
          </ol>
          <StallMiniMap locale={locale} data={data} stalls={combo.stalls} filters={filters} idPrefix="pickmap" />
        </div>
      </div>

      <Relaxed locale={locale} relaxed={relaxed} />

      <Actions
        locale={locale}
        filters={filters}
        params={params}
        nextSeed={nextSeed}
        vetoSlugs={[combo.main.slug.current]}
        eat={
          <EatThisButton
            key={`${params.seed}-${combo.main.slug.current}`}
            locale={locale}
            items={combo.items.map((dish) => ({ slug: dish.slug.current, price: dish.price }))}
            href={combo.stalls.length === 1 ? stallHref(locale, slugs, filters) : mapHref(locale, filters, slugs)}
          />
        }
      />
    </Card>
  );
}
