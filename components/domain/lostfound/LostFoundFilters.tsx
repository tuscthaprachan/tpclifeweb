"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Cluster } from "@/components/ui/Cluster";
import { Select, type SelectOption } from "@/components/ui/Select";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LostFoundCategory, LostFoundKind, LostFoundStatus } from "@/lib/sanity/types";
import { LOST_FOUND_CATEGORIES, categoryLabel } from "./categoryLabel";
import { kindLabel } from "./kindLabel";
import { LOST_FOUND_STATUSES, statusLabel } from "./statusLabel";

export interface LostFoundFiltersValue {
  kind: LostFoundKind | "";
  category: LostFoundCategory | "";
  /** "" means "every status", not "no filter chosen": the page itself defaults an absent query param to "open". */
  status: LostFoundStatus | "";
}

interface LostFoundFiltersProps {
  locale: Locale;
  value: LostFoundFiltersValue;
  hasActiveFilters: boolean;
  className?: string;
}

/**
 * The register's filter bar. Same pattern as FormFilters
 * (components/domain/form/FormFilters.tsx): a real `<form method="get">`
 * that works fully with JavaScript off, since app/[locale]/lost-and-found/page.tsx
 * reads `kind` / `category` / `status` off the URL query string and does the
 * actual filtering server-side, in GROQ (getLostFoundPage). The only thing
 * "use client" buys here is submitting on change, a convenience the submit
 * button already provides without it.
 */
export function LostFoundFilters({ locale, value, hasActiveFilters, className }: LostFoundFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const kindOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    { value: "lost", label: kindLabel("lost", locale) },
    { value: "found", label: kindLabel("found", locale) },
  ];

  const categoryOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...LOST_FOUND_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category, locale) })),
  ];

  const statusOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...LOST_FOUND_STATUSES.map((status) => ({ value: status, label: statusLabel(status, locale) })),
  ];

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="get" action={localePath(locale, "/lost-and-found")} aria-label={UI.filterBy[locale]} className={className}>
      <Cluster space={4} align="end">
        <Select
          id="lost-found-filter-kind"
          name="kind"
          label={UI.lostOrFound[locale]}
          options={kindOptions}
          defaultValue={value.kind}
          onChange={submitOnChange}
        />
        <Select
          id="lost-found-filter-category"
          name="category"
          label={UI.category[locale]}
          options={categoryOptions}
          defaultValue={value.category}
          onChange={submitOnChange}
        />
        <Select
          id="lost-found-filter-status"
          name="status"
          label={UI.status[locale]}
          options={statusOptions}
          defaultValue={value.status}
          onChange={submitOnChange}
        />
        <Button type="submit">{UI.applyFilters[locale]}</Button>
        {hasActiveFilters ? (
          <Button href={localePath(locale, "/lost-and-found")} variant="quiet">
            {UI.clearFilters[locale]}
          </Button>
        ) : null}
      </Cluster>
    </form>
  );
}
