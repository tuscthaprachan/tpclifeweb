"use client";

import Link from "next/link";
import { useState } from "react";

import { Dialog, Heading } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";

import { LargePhrase, type PhraseView } from "./LargePhrase";
import { EXTRAS, extras } from "./strings";

export interface OrderPhraseItem extends PhraseView {
  key: string;
  /** Where "Show to the stall" goes without JavaScript: the same page with `?show=<index>`. */
  href: string;
}

interface OrderPhraseProps {
  phrases: readonly OrderPhraseItem[];
  locale: Locale;
  /** Depth of the card's own heading in the page outline. */
  headingLevel?: HeadingLevel;
}

/**
 * How to order: each phrase as Thai (large), romanisation and meaning, with a
 * "Show to the stall" control that fills the screen with just the Thai.
 *
 * Progressive enhancement: every "Show to the stall" is a real link to
 * `?show=<index>`, which the page renders server side as a full screen view.
 * Once the page has hydrated, the click is caught and a modal dialog shows
 * the same thing without leaving the page, so the reader keeps their place.
 *
 * Thai text carries `lang="th"` and the romanisation `lang="th-Latn"`, so
 * screen readers pronounce each correctly inside an English page.
 */
export function OrderPhrase({ phrases, locale, headingLevel = 2 }: OrderPhraseProps) {
  const [shown, setShown] = useState<number | null>(null);
  const current = phrases[shown ?? 0];

  return (
    <section aria-labelledby="order-phrase-title" className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="flex flex-col gap-[var(--space-1)]">
          <Heading level={headingLevel} id="order-phrase-title" visualLevel={4} className="m-0">
            {EXTRAS.orderTitle[locale]}
          </Heading>
          <p className="m-0 text-sm text-ink-600">{EXTRAS.orderIntro[locale]}</p>
        </div>

        <ul className="m-0 flex list-none flex-col p-0">
          {phrases.map((phrase, index) => (
            <li
              key={phrase.key}
              className="flex flex-col gap-[var(--space-2)] border-b border-line py-[var(--space-4)] first:pt-0 last:border-b-0 last:pb-0"
            >
              <p lang="th" className="m-0 text-2xl font-semibold leading-snug text-ink-900">
                {phrase.th}
              </p>
              <dl className="m-0 grid gap-x-[var(--space-3)] gap-y-[var(--space-1)] text-ink-900 sm:grid-cols-[max-content_1fr]">
                <dt className="text-sm text-ink-600">{EXTRAS.sayItLike[locale]}</dt>
                <dd lang="th-Latn" className="m-0">
                  {phrase.romanised}
                </dd>
                <dt className="text-sm text-ink-600">{EXTRAS.itMeans[locale]}</dt>
                <dd lang="en" className="m-0">
                  {phrase.en}
                </dd>
              </dl>
              <p className="m-0">
                <Link
                  href={phrase.href}
                  scroll={false}
                  aria-label={extras.showPhraseLabel(locale, phrase.th)}
                  onClick={(event) => {
                    event.preventDefault();
                    setShown(index);
                  }}
                  className="inline-flex min-h-[var(--target-min)] items-center rounded-control border border-line-strong px-[var(--space-4)] font-medium text-action hover:bg-surface-alt"
                >
                  {EXTRAS.showToStall[locale]}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Dialog
        open={shown !== null}
        onClose={() => setShown(null)}
        title={EXTRAS.showDialogTitle[locale]}
        headingLevel={2}
        locale={locale}
        className="m-0 h-dvh max-h-none w-dvw max-w-none rounded-none border-0"
      >
        {current ? <LargePhrase phrase={current} locale={locale} /> : null}
      </Dialog>
    </section>
  );
}
