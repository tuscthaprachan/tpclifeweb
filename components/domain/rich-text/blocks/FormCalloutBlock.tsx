import { FormCallout } from "@/components/domain/form";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import type { FormRecord } from "@/lib/sanity/types";
import type { FormCalloutAttrs } from "@/lib/rich-text/schema";
import type { FormSummary } from "../types";

/**
 * Draws the live form card from a pre-resolved summary. `FormCallout` reads
 * only title, slug, purpose and the sign-in fields, so the summary is
 * adapted to the `FormRecord` shape it still types against (that component
 * moves to the new form type in the read layer switch).
 */
export function FormCalloutBlock({
  attrs,
  form,
  locale,
  headingLevel,
}: {
  attrs: FormCalloutAttrs;
  form: FormSummary | undefined;
  locale: Locale;
  headingLevel: HeadingLevel;
}) {
  if (!attrs?.formId || !form || !form.isActive) return null;

  const record = {
    title: form.title,
    slug: { current: form.slug },
    purpose: form.purpose,
    requiresSignIn: form.requiresSignIn,
    signInType: form.signInType,
  } as FormRecord;

  return <FormCallout form={record} locale={locale} headingLevel={headingLevel} />;
}
