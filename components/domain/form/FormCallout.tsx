import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { FormRecord } from "@/lib/content/types";
import { signInBadgeLabel } from "./labels";

export interface FormCalloutProps {
  /** An already-resolved form. The read layer (lib/content) resolves related forms before this component sees them, and `RichText` resolves a `formCallout` block's form from a `FormSummary`. Only the fields the callout draws are required. */
  form: Pick<FormRecord, "slug" | "title" | "purpose" | "requiresSignIn" | "signInType">;
  locale: Locale;
  /** The depth this callout's own heading sits at wherever it is embedded, so it never skips a level inside a rich text body (1.3.1). */
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
 * Laid out as a GOV.UK summary card: white, a thin border, and a title row
 * above a rule. No tinted fill and no coloured stripe.
 *
 * An editor dropping a form reference into a welfare page's rich text
 * body always renders from this one source of truth, so the callout can
 * never drift from what the form's own page says.
 *
 * Import as: `import { FormCallout } from "@/components/domain/form"`.
 */
export function FormCallout({ form, locale, headingLevel, className }: FormCalloutProps) {
  const href = localePath(locale, `/forms/${form.slug.current}`);

  return (
    <div className={cx("border border-line-strong bg-surface", className)}>
      <div className="border-b border-line px-[var(--space-4)] py-[var(--space-3)]">
        <Heading level={headingLevel} className="m-0 text-lg">
          <Link href={href} className="text-action no-underline hover:text-action-hover hover:underline">
            {pick(form.title, locale)}
          </Link>
        </Heading>
      </div>
      <div className="px-[var(--space-4)] py-[var(--space-3)]">
        <p className="m-0 text-ink-900">{pick(form.purpose, locale)}</p>
        {form.requiresSignIn ? (
          <StatusTag tone="warning" label={signInBadgeLabel(form.signInType, locale)} className="mt-[var(--space-2)]" />
        ) : null}
      </div>
    </div>
  );
}
