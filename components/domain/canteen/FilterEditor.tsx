"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { FiltersIcon } from "./icons";
import { EAT, eat, t } from "./strings";

interface FilterEditorProps {
  locale: Locale;
  /** How many filter values are on, for the button label. */
  count: number;
  /** The filter form, shown inside the dialog. */
  children: ReactNode;
}

/**
 * The "Edit filters" control for small screens. With JavaScript it opens the
 * filter form in a full screen Dialog. Without JavaScript it is a plain link
 * to `#eat-filters`, the copy of the form that the page includes inside
 * `<noscript>`, so nobody is left without a way to change the filters.
 * Hidden from `md` up, where the form is a column beside the results.
 *
 * Once the bar has scrolled out of view above, a floating "Filters (n)" pill
 * near the bottom of the screen opens the same Dialog, so a long list is never
 * a long way from the filters. It is client only, so it is absent without
 * JavaScript, and it is hidden while the Dialog is open. When the Dialog
 * closes, focus goes back to whichever button opened it.
 */
export function FilterEditor({ locale, count, children }: FilterEditorProps) {
  const [open, setOpen] = useState(false);
  const [away, setAway] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const floating = useRef<HTMLButtonElement>(null);
  const opener = useRef<"bar" | "floating" | null>(null);

  useEffect(() => {
    const bar = wrap.current?.closest("section");
    if (!bar || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setAway(entry !== undefined && !entry.isIntersecting && entry.boundingClientRect.bottom < 0));
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open || !opener.current) return;
    const target = opener.current === "floating" ? floating.current : null;
    (target ?? wrap.current?.querySelector("a"))?.focus();
    opener.current = null;
  }, [open]);

  const label = eat.editFiltersWithCount(locale, count);
  const floatingLabel = count > 0 ? `${t(EAT.filtersTitle, locale)} (${formatNumber(count, locale)})` : t(EAT.filtersTitle, locale);

  return (
    <div ref={wrap} className="contents">
      <Button
        href="#eat-filters"
        variant="secondary"
        size="sm"
        className="md:hidden"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          opener.current = "bar";
          setOpen(true);
        }}
      >
        <FiltersIcon />
        {label}
      </Button>
      {away && !open ? (
        <button
          ref={floating}
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            opener.current = "floating";
            setOpen(true);
          }}
          className="fixed bottom-[max(var(--space-4),env(safe-area-inset-bottom))] left-1/2 z-[60] inline-flex min-h-[var(--target-min)] -translate-x-1/2 items-center gap-[var(--space-2)] rounded-pill bg-action px-[var(--space-5)] py-[var(--space-2)] text-base font-medium whitespace-nowrap text-action-ink shadow-[var(--shadow-elevation)] hover:bg-action-hover md:hidden"
        >
          <FiltersIcon />
          {floatingLabel}
        </button>
      ) : null}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t(EAT.filtersTitle, locale)}
        headingLevel={2}
        locale={locale}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-auto rounded-none scroll-pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        {/* A submit bubbles up here after the form has handled it, which is the cue to close. */}
        <div onSubmit={() => setOpen(false)}>{children}</div>
      </Dialog>
    </div>
  );
}
