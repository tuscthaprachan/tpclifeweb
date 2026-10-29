/**
 * The public availability calendar: choose an item to see which days it is
 * free, or pass ?date= to see every item on one day. All GET query
 * parameters, so it works without JavaScript. The counts are worked out from
 * bookings, so the page calls them a guide and never live.
 */

import Form from "next/form";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { AvailabilityMonth, DayItems, ItemChooser, av } from "@/components/domain/borrowing";
import { Button, Container, Heading, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { dayAvailability, monthAvailability } from "@/lib/borrowing/calendar";
import { listInventory } from "@/lib/borrowing/availability";
import { dayKeyOf, addMonths, isDayKey, isMonthKey } from "@/lib/borrowing/time";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** How many months ahead the calendar goes: a little past the 90 days a request may be made ahead. */
const MONTHS_AHEAD = 3;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/borrow/availability"),
    title: av("title", locale),
    description: av("intro", locale),
  };
}

export default async function AvailabilityPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const query = await searchParams;
  const basePath = localePath(locale, "/borrow/availability");

  const now = new Date();
  const thisMonth = dayKeyOf(now).slice(0, 7);
  const lastMonth = addMonths(thisMonth, MONTHS_AHEAD);
  const rawMonth = first(query.month);
  const month = isMonthKey(rawMonth) && rawMonth >= thisMonth && rawMonth <= lastMonth ? rawMonth : thisMonth;
  const rawDate = first(query.date);
  const date = isDayKey(rawDate) ? rawDate : null;
  const slug = first(query.item)?.trim() || null;

  let body: ReactNode = null;
  if (!isDatabaseConfigured()) {
    body = (
      <NotificationBanner variant="warning" title={av("unavailableTitle", locale)}>
        {av("unavailableBody", locale)}
      </NotificationBanner>
    );
  } else {
    const db = getDb();
    const inventory = await listInventory(db, { activeOnly: true });
    const monthData = slug && !date ? await monthAvailability(db, slug, month, now) : null;
    body = (
      <Stack space={6}>
        {date ? (
          <DayItems locale={locale} data={await dayAvailability(db, date, now)} basePath={basePath} />
        ) : monthData ? (
          <AvailabilityMonth
            locale={locale}
            data={monthData}
            inventory={inventory}
            basePath={basePath}
            previousMonth={month > thisMonth ? addMonths(month, -1) : null}
            nextMonth={month < lastMonth ? addMonths(month, 1) : null}
            dayHref={(day) => `${basePath}?date=${day}`}
          />
        ) : (
          <>
            {slug ? <p className="m-0 text-ink-900">{av("notFound", locale)}</p> : null}
            <ItemChooser locale={locale} inventory={inventory} basePath={basePath} month={month} />
          </>
        )}
        <Form action={basePath} className="flex flex-wrap items-end gap-[var(--space-3)]">
          <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
            <label htmlFor="avail-date" className="text-base font-medium text-ink-900">
              {av("dayFormLabel", locale)}
            </label>
            <input
              id="avail-date"
              type="date"
              name="date"
              defaultValue={date ?? ""}
              min={dayKeyOf(now)}
              className="min-h-[var(--target-min)] max-w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
            />
          </div>
          <Button type="submit" variant="secondary">
            {av("dayFormSubmit", locale)}
          </Button>
        </Form>
      </Stack>
    );
  }

  return (
    <Container>
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: av("breadcrumbBorrow", locale), path: "/borrow" }, { label: av("breadcrumbSelf", locale) }]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{av("title", locale)}</Heading>
          <p className="m-0 text-ink-900">{av("intro", locale)}</p>
        </Stack>
        <InsetText>
          <p className="m-0">{av("guideNote", locale)}</p>
        </InsetText>
        {body}
        <div>
          <Button href={localePath(locale, "/borrow")}>{av("startRequest", locale)}</Button>
        </div>
      </Stack>
    </Container>
  );
}
