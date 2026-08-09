import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { StatusTag } from "@/components/ui/StatusTag";
import { Tag } from "@/components/ui/Tag";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { FormRecord } from "@/lib/sanity/types";
import { CATEGORY_LABEL_KEY } from "./labels";

interface FormCardProps {
  form: FormRecord;
  locale: Locale;
  /** The depth this card's own title sits at in the page outline (1.3.1). */
  headingLevel: HeadingLevel;
  className?: string;
}

/**
 * A compact card for a small, deliberately prominent set of forms: the
 * priority group at the top of the index today, the home page later.
 *
 * An ordinary listing of forms is a `FormList` row, not a card. See
 * CONTRIBUTING.md: "Avoid card grids where a list is the honest shape."
 * Cards are reserved for the small priority set, which is exactly what this
 * component is for.
 */
export function FormCard({ form, locale, headingLevel, className }: FormCardProps) {
  const href = localePath(locale, `/forms/${form.slug.current}`);

  return (
    <div className={cx("flex h-full flex-col rounded-panel border border-line bg-surface p-[var(--space-4)]", className)}>
      <Stack space={2} className="flex-1">
        <Tag tone={form.category}>{UI[CATEGORY_LABEL_KEY[form.category]][locale]}</Tag>
        <Heading level={headingLevel} className="text-lg">
          <Link href={href} className="text-ink-900 no-underline hover:text-action hover:underline">
            {pick(form.title, locale)}
          </Link>
        </Heading>
        <p className="m-0 text-ink-600">{pick(form.purpose, locale)}</p>
      </Stack>

      {form.requiresSignIn ? (
        <StatusTag tone="warning" label={UI.requiresSignIn[locale]} className="mt-[var(--space-3)] self-start" />
      ) : null}
    </div>
  );
}
