import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { client } from "@/lib/sanity/client";
import { CACHE_TAGS } from "@/lib/sanity/env";
import type { FormRecord, SanityRef } from "@/lib/sanity/types";

// The forms agent owns components/domain/form/** and exports FormCallout: a
// component that takes a resolved FormRecord and a headingLevel, and renders
// that form's title, requirements and sign-in warning. It is being built in
// parallel with this file. If this import does not resolve yet, it will by
// integration time; do not stub it locally, that would just be a second,
// divergent implementation of the same card.
import { FormCallout } from "@/components/domain/form";

export interface FormCalloutValue {
  _type: "formCallout";
  _key: string;
  form?: SanityRef | FormRecord;
}

function isResolvedForm(form: FormCalloutValue["form"]): form is FormRecord {
  return Boolean(form) && (form as { _type?: string })._type === "form";
}

/**
 * The fixed queries in lib/sanity/queries.ts (`CONTENT_PAGE_PROJECTION`,
 * `EVENT_PROJECTION`, and friends) resolve top-level reference fields such as
 * `relatedForms`, but they read body Portable Text with a plain `...` spread,
 * which does not reach into an embedded object's own reference field. A
 * `formCallout` sitting inside a page body therefore arrives as a bare
 * `{_ref}` unless something resolves it, so this component does that itself,
 * by id, through the same read-only published-content client every other
 * query on the site uses.
 */
const FORM_BY_ID_QUERY = /* groq */ `*[_id == $id][0]{ _id, _type, _createdAt, _updatedAt, ... }`;

async function resolveForm(form: FormCalloutValue["form"]): Promise<FormRecord | null> {
  if (!form) return null;
  if (isResolvedForm(form)) return form;
  const id = form._ref;
  if (!id) return null;
  return client.fetch<FormRecord | null>(FORM_BY_ID_QUERY, { id }, { next: { tags: [CACHE_TAGS.form] } });
}

export async function FormCalloutBlock({
  value,
  locale,
  headingLevel,
}: {
  value: FormCalloutValue;
  locale: Locale;
  headingLevel: HeadingLevel;
}) {
  const form = await resolveForm(value?.form);
  if (!form || form.isActive === false) return null;

  return <FormCallout form={form} locale={locale} headingLevel={headingLevel} />;
}
