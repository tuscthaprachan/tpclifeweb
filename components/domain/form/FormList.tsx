import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { Tag } from "@/components/ui/Tag";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { FormRecord } from "@/lib/content/types";
import { CATEGORY_LABEL_KEY, NO_SIGN_IN_ON_FORM, OWNER_LABEL_KEY, signInBadgeLabel } from "./labels";

interface FormListProps {
  forms: FormRecord[];
  locale: Locale;
  /** The depth every form title sits at. Every row is a sibling, so they all share one level (1.3.1). */
  headingLevel: HeadingLevel;
  className?: string;
}

/**
 * The index's honest shape: a list of forms with different weight, one row
 * per form, not a grid of equal tiles. See CONTRIBUTING.md: "A form index is
 * a LIST of things with different weight, not a bento grid of equal tiles."
 */
export function FormList({ forms, locale, headingLevel, className }: FormListProps) {
  return (
    <ul className={cx("m-0 list-none divide-y divide-line p-0", className)}>
      {forms.map((form) => {
        const href = localePath(locale, `/forms/${form.slug.current}`);
        return (
          <li key={form._id} className="flex flex-col gap-[var(--space-2)] py-[var(--space-4)]">
            <Heading level={headingLevel} className="text-lg">
              <Link href={href} className="text-action no-underline hover:text-action-hover hover:underline">
                {pick(form.title, locale)}
              </Link>
            </Heading>
            <p className="m-0 text-ink-600">{pick(form.purpose, locale)}</p>
            <div className="flex flex-wrap items-center gap-[var(--space-2)]">
              <Tag tone={form.category}>{UI[CATEGORY_LABEL_KEY[form.category]][locale]}</Tag>
              <span className="text-sm text-ink-600">{UI[OWNER_LABEL_KEY[form.owner]][locale]}</span>
              {form.requiresSignIn ? (
                <StatusTag tone="warning" label={signInBadgeLabel(form.signInType, locale)} />
              ) : (
                <StatusTag tone="success" label={NO_SIGN_IN_ON_FORM[locale]} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
