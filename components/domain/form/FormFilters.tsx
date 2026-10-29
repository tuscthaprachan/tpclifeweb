"use client";

import Form from "next/form";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Cluster } from "@/components/ui/Cluster";
import { Select, type SelectOption } from "@/components/ui/Select";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Category, Owner } from "@/lib/content/types";
import { CATEGORY_LABEL_KEY, NO_SIGN_IN_ON_FORM, OWNER_LABEL_KEY, SIGN_IN_ON_FORM } from "./labels";

export interface FormFiltersValue {
  category: Category | "";
  owner: Owner | "";
  signIn: "required" | "none" | "";
}

interface FormFiltersProps {
  locale: Locale;
  value: FormFiltersValue;
  hasActiveFilters: boolean;
  className?: string;
}

/**
 * The forms index filter bar.
 *
 * The base is a real `<form method="get">`: three selects and a submit
 * button, all reachable and functional with JavaScript off, since the page
 * that reads `category` / `owner` / `signIn` off the URL query string does
 * all the actual filtering server-side (app/[locale]/forms/page.tsx). That
 * also satisfies 3.3.7 Redundant Entry: the chosen filters live in the URL,
 * so they survive a reload, a back navigation, or a bookmark.
 *
 * The only thing "use client" buys here is `submitOnChange`: a pure
 * convenience that submits the form the moment a select changes, so a mouse
 * or keyboard user does not have to find the button too. Remove the
 * JavaScript and the button still works exactly the same way.
 */
export function FormFilters({ locale, value, hasActiveFilters, className }: FormFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const categoryOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...(Object.keys(CATEGORY_LABEL_KEY) as Category[]).map((category) => ({
      value: category,
      label: UI[CATEGORY_LABEL_KEY[category]][locale],
    })),
  ];

  const ownerOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    ...(Object.keys(OWNER_LABEL_KEY) as Owner[]).map((owner) => ({
      value: owner,
      label: UI[OWNER_LABEL_KEY[owner]][locale],
    })),
  ];

  const signInOptions: SelectOption[] = [
    { value: "", label: UI.all[locale] },
    { value: "required", label: SIGN_IN_ON_FORM[locale] },
    { value: "none", label: NO_SIGN_IN_ON_FORM[locale] },
  ];

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <Form ref={formRef} action={localePath(locale, "/forms")} aria-label={UI.filterBy[locale]} className={className}>
      <Cluster space={4} align="end">
        <Select
          id="forms-filter-category"
          name="category"
          label={UI.category[locale]}
          options={categoryOptions}
          defaultValue={value.category}
          onChange={submitOnChange}
        />
        <Select
          id="forms-filter-owner"
          name="owner"
          label={UI.formOwner[locale]}
          options={ownerOptions}
          defaultValue={value.owner}
          onChange={submitOnChange}
        />
        <Select
          id="forms-filter-sign-in"
          name="signIn"
          // TODO: add to UI strings. No shared label exists for "filter by
          // sign-in requirement".
          label={locale === "th" ? "การเข้าสู่ระบบ" : "Sign-in requirement"}
          options={signInOptions}
          defaultValue={value.signIn}
          onChange={submitOnChange}
        />
        <Button type="submit">{UI.applyFilters[locale]}</Button>
        {hasActiveFilters ? (
          <Button href={localePath(locale, "/forms")} variant="quiet">
            {UI.clearFilters[locale]}
          </Button>
        ) : null}
      </Cluster>
    </Form>
  );
}
