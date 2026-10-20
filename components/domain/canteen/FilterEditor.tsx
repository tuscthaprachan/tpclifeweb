"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Locale } from "@/lib/i18n/config";
import { FiltersIcon } from "./icons";
import { EAT, eat, t } from "./strings";

interface FilterEditorProps {
  locale: Locale;
  /** How many filter values are on, for the button label. */
  count: number;
  /** The filter form, rendered on the server, shown inside the dialog. */
  children: ReactNode;
}

/**
 * The "Edit filters" control for small screens. With JavaScript it opens the
 * filter form in a full screen Dialog. Without JavaScript it is a plain link
 * to `#eat-filters`, the copy of the form that the page includes inside
 * `<noscript>`, so nobody is left without a way to change the filters.
 * Hidden from `md` up, where the form is a column beside the results.
 */
export function FilterEditor({ locale, count, children }: FilterEditorProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        href="#eat-filters"
        variant="secondary"
        size="sm"
        className="md:hidden"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <FiltersIcon />
        {eat.editFiltersWithCount(locale, count)}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t(EAT.filtersTitle, locale)}
        headingLevel={2}
        locale={locale}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-auto rounded-none"
      >
        {/* A submit bubbles up here after the form has handled it, which is the cue to close. */}
        <div onSubmit={() => setOpen(false)}>{children}</div>
      </Dialog>
    </>
  );
}
