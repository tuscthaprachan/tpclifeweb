import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { FormRecord } from "@/lib/sanity/types";

export interface FormCalloutProps {
  /** An already-resolved form, not a `SanityRef`. The `relatedForms[]->{...}` / `relatedForm->{...}` projections in lib/sanity/queries.ts resolve the reference before this component ever sees it. */
  form: FormRecord;
  locale: Locale;
  /** The depth this callout's own heading sits at wherever it is embedded, so it never skips a level inside a Portable Text body (1.3.1). */
  headingLevel: HeadingLevel;
  className?: string;
}

/**
 * The piece that disperses form prompts across the rest of the site. Given a
 * resolved `FormRecord`, it renders the form's live title, its one-sentence
 * purpose, the sign-in warning if there is one, and a link through to the
 * form's own page, never straight to the external `destinationUrl`, so the
 * "check before you click" page can never be skipped.
 *
 * An editor dropping a form reference into a welfare page's Portable Text
 * body always renders from this one source of truth, so the callout can
 * never drift from what the form's own page says.
 *
 * Import as: `import { FormCallout } from "@/components/domain/form"`.
 */
export function FormCallout({ form, locale, headingLevel, className }: FormCalloutProps) {
  const href = localePath(locale, `/forms/${form.slug.current}`);

  return (
    <div className={cx("rounded-panel border-l-[var(--border-width-thick)] border-action bg-surface-alt p-[var(--space-4)]", className)}>
      <Heading level={headingLevel} className="text-lg">
        <Link href={href} className="text-action no-underline hover:text-action-hover hover:underline">
          {pick(form.title, locale)}
        </Link>
      </Heading>
      <p className="m-0 mt-[var(--space-1)] text-ink-600">{pick(form.purpose, locale)}</p>
      {form.requiresSignIn ? (
        <StatusTag tone="warning" label={UI.requiresSignIn[locale]} className="mt-[var(--space-2)]" />
      ) : null}
    </div>
  );
}
