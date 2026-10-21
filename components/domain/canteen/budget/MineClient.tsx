"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Heading } from "@/components/ui/Heading";
import { Timestamp } from "@/components/ui/Timestamp";
import { device } from "@/lib/canteen";
import type { SavedWeek } from "@/lib/canteen/device";
import { defaultFilters, parse, serialise } from "@/lib/canteen/params";
import { localePath, pick, type Locale } from "@/lib/i18n/config";

import { filterSummary } from "../chips";
import { dishHref } from "../links";
import { EAT, eat, t } from "../strings";
import { BUDGET, WEEKDAY_NAME, budget } from "./strings";
import { SpendThisWeek } from "./SpendThisWeek";

/** What the server knows about one dish, small enough to send to the browser. */
export interface MineDish {
  name: { th: string; en: string };
  stallNumber: number;
  stallName: { th: string; en: string };
  /** Baht as surveyed, not counting extras. */
  price: number;
  checkedOn?: string;
}

interface MineClientProps {
  locale: Locale;
  /** Every dish on the menu, by slug. A slug that is not here is no longer on the menu. */
  dishes: Record<string, MineDish>;
  /** Stall names by slug, for the saved filter summary. */
  stallNames: Record<string, { th: string; en: string }>;
  /** The filters in this page's own link (serialised), if any, so they can be saved as defaults. */
  currentQuery: string;
}

const HISTORY_SHOWN = 30;
const subscribeNever = () => () => {};
let storageProbe: boolean | undefined;
function storageReady(): boolean {
  if (storageProbe === undefined) storageProbe = device.isStorageAvailable();
  return storageProbe;
}

/**
 * Everything the device remembers, drawn in the browser. Nothing here comes
 * from the server except the menu to resolve slugs against: favourites,
 * history, dislikes, defaults and the saved week are read from localStorage
 * through `device` and re-read whenever they change. Until the browser has
 * answered, and when it will not keep data, the page says so plainly and
 * shows no list.
 */
export function MineClient({ locale, dishes, stallNames, currentQuery }: MineClientProps) {
  const ready = useSyncExternalStore(subscribeNever, storageReady, () => null as boolean | null);
  const favourites = useSyncExternalStore(device.subscribe, device.getFavourites, () => device.EMPTY_FAVOURITES);
  const dislikes = useSyncExternalStore(device.subscribe, device.getDislikes, () => device.EMPTY_DISLIKES);
  const history = useSyncExternalStore(device.subscribe, device.getHistory, () => device.EMPTY_HISTORY);
  const defaults = useSyncExternalStore(device.subscribe, device.getDefaultFilters, () => null);
  const savedWeek = useSyncExternalStore(device.subscribe, device.getSavedWeek, () => null);

  const [message, setMessage] = useState<string>("");
  const [confirming, setConfirming] = useState(false);

  if (ready === null) {
    return (
      <p className="mine-loading m-0 text-ink-600" role="status">
        {t(BUDGET.mineLoading, locale)}
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-panel border border-line bg-surface-alt p-[var(--space-6)]">
        <Heading level={2} className="m-0 text-xl">
          {t(BUDGET.mineNoStorageTitle, locale)}
        </Heading>
        <p className="mb-0 mt-[var(--space-2)] text-ink-900">{t(BUDGET.mineNoStorageBody, locale)}</p>
      </div>
    );
  }

  const failed = () => t(BUDGET.saveFailed, locale);
  const run = (ok: boolean, done = "") => setMessage(ok ? done : failed());

  const stallLabel = (dish: MineDish) => eat.stallFull(locale, dish.stallNumber, pick(dish.stallName, locale));
  const noFilters = defaultFilters();

  const dishLine = (slug: string, extra?: ReactNode) => {
    const dish = dishes[slug];
    if (!dish) {
      return (
        <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <span className="font-medium text-ink-900">{t(BUDGET.staleDish, locale)}</span>
          <span className="break-all text-sm text-ink-600">{slug}</span>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
        <Link href={dishHref(locale, slug, noFilters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
          {pick(dish.name, locale)}
        </Link>
        <span className="text-sm text-ink-600">
          {stallLabel(dish)} · {eat.baht(locale, dish.price)}
          {dish.checkedOn ? (
            <>
              {" · "}
              {t(EAT.priceCheckedOn, locale)} <Timestamp value={dish.checkedOn} locale={locale} />
            </>
          ) : null}
        </span>
        {extra}
      </div>
    );
  };

  const removeButton = (slug: string, onClick: () => void) => {
    const name = dishes[slug] ? pick(dishes[slug]!.name, locale) : t(BUDGET.staleDish, locale);
    return (
      <Button variant="secondary" size="sm" type="button" onClick={onClick} aria-label={budget.removeNamed(locale, name)} className="shrink-0">
        {t(BUDGET.remove, locale)}
      </Button>
    );
  };

  const list = (items: ReactNode[], empty: string) =>
    items.length === 0 ? (
      <p className="m-0 text-ink-600">{empty}</p>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">{items}</ul>
    );

  const row = (key: string, content: ReactNode) => (
    <li key={key} className="flex flex-wrap items-start justify-between gap-x-[var(--space-4)] gap-y-[var(--space-2)] rounded-panel border border-line bg-surface p-[var(--space-3)]">
      {content}
    </li>
  );

  const latest = [...history].reverse().slice(0, HISTORY_SHOWN);
  const stallName = (slug: string) => (stallNames[slug] ? pick(stallNames[slug]!, locale) : undefined);
  const savedQuery = defaults ? serialise(defaults) : "";
  const hasAnything =
    favourites.length > 0 || dislikes.length > 0 || history.length > 0 || defaults !== null || savedWeek !== null;
  const currentFilters = currentQuery ? new URLSearchParams(currentQuery) : null;

  const section = (id: string, title: string, children: ReactNode) => (
    <section aria-labelledby={`mine-${id}`} className="flex flex-col gap-[var(--space-3)]">
      <Heading level={2} id={`mine-${id}`} className="m-0 text-xl">
        {title}
      </Heading>
      {children}
    </section>
  );

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      <div role="status" className="min-h-0 text-ink-900 empty:hidden">
        {message}
      </div>

      {section(
        "spend",
        t(BUDGET.spendTitle, locale),
        <SpendThisWeek locale={locale} />,
      )}

      {section(
        "favourites",
        t(BUDGET.favouritesTitle, locale),
        list(
          favourites.map((slug) =>
            row(slug, <>{dishLine(slug)}{removeButton(slug, () => run(device.toggleFavourite(slug)))}</>),
          ),
          t(BUDGET.favouritesEmpty, locale),
        ),
      )}

      {section(
        "history",
        t(BUDGET.historyTitle, locale),
        <>
          {list(
            latest.map((entry) =>
              row(
                `${entry.slug}-${entry.at}`,
                <>
                  {dishLine(
                    entry.slug,
                    <span className="text-sm text-ink-600">
                      <Timestamp value={entry.at} locale={locale} format="datetime" /> · {budget.historyLine(locale, entry.price)}
                    </span>,
                  )}
                  {removeButton(entry.slug, () => run(device.removeHistory(entry)))}
                </>,
              ),
            ),
            t(BUDGET.historyEmpty, locale),
          )}
          {history.length > HISTORY_SHOWN ? (
            <p className="m-0 text-sm text-ink-600">{budget.latestOf(locale, HISTORY_SHOWN, history.length)}</p>
          ) : null}
        </>,
      )}

      {section(
        "dislikes",
        t(BUDGET.dislikesTitle, locale),
        list(
          dislikes.map((slug) => row(slug, <>{dishLine(slug)}{removeButton(slug, () => run(device.toggleDislike(slug)))}</>)),
          t(BUDGET.dislikesEmpty, locale),
        ),
      )}

      {section(
        "defaults",
        t(BUDGET.defaultsTitle, locale),
        <div className="flex flex-col gap-[var(--space-3)]">
          {defaults ? (
            <>
              <p className="m-0 text-ink-900">{filterSummary(defaults, locale, stallName) || t(BUDGET.defaultsEmpty, locale)}</p>
              <div className="flex flex-wrap gap-[var(--space-3)]">
                <Button variant="secondary" href={`${localePath(locale, "/eat/dishes")}${savedQuery ? `?${savedQuery}` : ""}`}>
                  {t(BUDGET.defaultsUse, locale)}
                </Button>
                <Button variant="secondary" type="button" onClick={() => run(device.clearDefaultFilters())}>
                  {t(BUDGET.defaultsClear, locale)}
                </Button>
              </div>
            </>
          ) : (
            <p className="m-0 text-ink-600">{t(BUDGET.defaultsEmpty, locale)}</p>
          )}
          {currentFilters ? (
            <div className="flex flex-col gap-[var(--space-2)]">
              <p className="m-0 text-sm text-ink-600">
                {t(BUDGET.defaultsCurrentHint, locale)}{" "}
                {filterSummary(defaultsFrom(currentQuery), locale, stallName)}
              </p>
              <div>
                <Button
                  type="button"
                  onClick={() => run(device.setDefaultFilters(defaultsFrom(currentQuery)), t(BUDGET.defaultsSaved, locale))}
                >
                  {t(BUDGET.defaultsSetFromCurrent, locale)}
                </Button>
              </div>
            </div>
          ) : (
            <p className="m-0 text-sm text-ink-600">{t(BUDGET.defaultsNoCurrent, locale)}</p>
          )}
        </div>,
      )}

      {section(
        "week",
        t(BUDGET.savedWeekTitle, locale),
        savedWeek ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <p className="m-0 text-ink-900">
              {budget.weekSummary(locale, savedWeek.days.length, savedWeek.budget)}. {t(BUDGET.savedWeekSavedOn, locale)}{" "}
              <Timestamp value={savedWeek.savedAt} locale={locale} />
            </p>
            <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
              {[...savedWeek.days]
                .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))
                .map((day) => (
                  <li key={day.weekday} className="flex flex-wrap items-baseline gap-x-[var(--space-3)] rounded-panel border border-line bg-surface p-[var(--space-3)]">
                    <span className="min-w-[8rem] font-medium text-ink-900">{WEEKDAY_NAME[day.weekday]?.[locale]}</span>
                    {dishes[day.slug] ? (
                      <span>
                        {pick(dishes[day.slug]!.name, locale)} · {stallLabel(dishes[day.slug]!)} · {eat.baht(locale, day.price)}
                      </span>
                    ) : (
                      <span>{t(BUDGET.staleDish, locale)}</span>
                    )}
                  </li>
                ))}
            </ul>
            <p className="m-0 text-sm text-ink-600">{t(BUDGET.savedWeekPriceNote, locale)}</p>
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button variant="secondary" href={savedWeekHref(locale, savedWeek)}>
                {t(BUDGET.savedWeekOpen, locale)}
              </Button>
              <Button variant="secondary" type="button" onClick={() => run(device.clearSavedWeek())}>
                {t(BUDGET.savedWeekClear, locale)}
              </Button>
            </div>
          </div>
        ) : (
          <p className="m-0 text-ink-600">
            {t(BUDGET.savedWeekEmpty, locale)}{" "}
            <Link href={localePath(locale, "/eat/plan?mode=week")}>{t(BUDGET.weekTitle, locale)}</Link>
          </p>
        ),
      )}

      {section(
        "clear",
        t(BUDGET.clearTitle, locale),
        <div className="flex flex-col gap-[var(--space-3)]">
          <p className="m-0 text-ink-900">{t(BUDGET.clearHint, locale)}</p>
          <div>
            <Button variant="destructive" type="button" disabled={!hasAnything} onClick={() => setConfirming(true)}>
              {t(BUDGET.clearTitle, locale)}
            </Button>
          </div>
          <p className="m-0 text-sm text-ink-600">{t(BUDGET.storageNote, locale)}</p>
        </div>,
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)} title={t(BUDGET.clearAsk, locale)} headingLevel={2} locale={locale} className="w-[min(92vw,28rem)]">
        <p className="mt-0 text-ink-900">{t(BUDGET.clearAskBody, locale)}</p>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button
            variant="destructive"
            type="button"
            onClick={() => {
              const ok = device.clearAll();
              setConfirming(false);
              setMessage(ok ? t(BUDGET.clearDone, locale) : t(BUDGET.clearFailed, locale));
            }}
          >
            {t(BUDGET.clearConfirm, locale)}
          </Button>
          <Button variant="secondary" type="button" onClick={() => setConfirming(false)}>
            {t(BUDGET.clearCancel, locale)}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function defaultsFrom(query: string) {
  return parse(new URLSearchParams(query));
}

/** The link that reopens a saved week: its seed and budget, its days and its dishes (kept, not locked). */
function savedWeekHref(locale: Locale, week: SavedWeek): string {
  const parts = ["mode=week", `budget=${week.budget}`, `days=${week.days.map((day) => day.weekday).join(",")}`, `seed=${encodeURIComponent(week.seed)}`];
  for (const day of week.days) parts.push(`keep.${day.weekday}=${encodeURIComponent(day.slug)}`);
  return `${localePath(locale, "/eat/plan")}?${parts.join("&")}`;
}
