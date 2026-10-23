"use client";

import { useRef } from "react";
import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { Button } from "@/components/ui/Button";
import { Cluster } from "@/components/ui/Cluster";
import { Select, type SelectOption } from "@/components/ui/Select";
import { localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Owner, PolicyStatus } from "@/lib/content/types";
import { STATUS_LABEL_KEY, STATUS_ORDER } from "./statusLabels";

/**
 * No shared label exists for "policy area": UI.category names the fixed
 * transport/welfare/activity/governance taxonomy used by forms and content
 * pages, a different, closed set from a policy's free-text `policyArea`.
 */
// TODO: add to UI strings.
const POLICY_AREA_LABEL: LocaleString = { th: "ประเด็นนโยบาย", en: "Policy area" };

const OWNER_FILTER_ORDER: readonly Owner[] = ["tusu", "tusc", "university", "joint"];

export interface PolicyAreaOption {
  value: string;
  label: string;
}

export interface PolicyFiltersValue {
  owner: Owner | "";
  area: string;
  status: PolicyStatus | "";
}

interface PolicyFiltersProps {
  locale: Locale;
  value: PolicyFiltersValue;
  areaOptions: PolicyAreaOption[];
  hasActiveFilters: boolean;
  className?: string;
}

/**
 * The policy dashboard's filter bar. A real `<form method="get">`: three
 * selects and a submit button, reachable and functional with JavaScript off,
 * since the page that reads `owner` / `area` / `status` off the URL query
 * string does all the actual filtering server-side
 * (app/[locale]/policy/page.tsx). That also satisfies 3.3.7 Redundant Entry:
 * the chosen filters live in the URL, so a filtered view is shareable and
 * survives a reload or a back navigation. Mirrors FormFilters
 * (components/domain/form/FormFilters.tsx).
 *
 * "use client" buys only `submitOnChange`, a convenience that submits the
 * form the moment a select changes. Remove the JavaScript and the "Apply
 * filters" button still does exactly the same thing.
 */
export function PolicyFilters({ locale, value, areaOptions, hasActiveFilters, className }: PolicyFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const ownerOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...OWNER_FILTER_ORDER.map((owner) => ({ value: owner, label: UI[OWNER_LABEL_KEY[owner]][locale] })),
  ];

  const areaSelectOptions: SelectOption[] = [{ value: "", label: UI.all[locale] }, ...areaOptions];

  const statusOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...STATUS_ORDER.map((status) => ({ value: status, label: UI[STATUS_LABEL_KEY[status]][locale] })),
  ];

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="get" action={localePath(locale, "/policy")} aria-label={UI.filterBy[locale]} className={className}>
      <Cluster space={4} align="end">
        <Select
          id="policy-filter-owner"
          name="owner"
          label={UI.owner[locale]}
          options={ownerOptions}
          defaultValue={value.owner}
          onChange={submitOnChange}
        />
        <Select
          id="policy-filter-area"
          name="area"
          label={POLICY_AREA_LABEL[locale]}
          options={areaSelectOptions}
          defaultValue={value.area}
          onChange={submitOnChange}
        />
        <Select
          id="policy-filter-status"
          name="status"
          label={UI.status[locale]}
          options={statusOptions}
          defaultValue={value.status}
          onChange={submitOnChange}
        />
        <Button type="submit">{UI.applyFilters[locale]}</Button>
        {hasActiveFilters ? (
          <Button href={localePath(locale, "/policy")} variant="quiet">
            {UI.clearFilters[locale]}
          </Button>
        ) : null}
      </Cluster>
    </form>
  );
}
