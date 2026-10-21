import { CheckIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import { pick, type Locale } from "@/lib/i18n/config";
import type { FormPrerequisite } from "@/lib/sanity/types";

interface FormRequirementsProps {
  prerequisites: FormPrerequisite[];
  locale: Locale;
  className?: string;
}

/**
 * "What you need", rendered as a checklist: step two of the GOV.UK "check a
 * service is suitable" pattern that the single form page follows. Renders
 * nothing when there are no prerequisites, so a caller can use it
 * unconditionally.
 */
export function FormRequirements({ prerequisites, locale, className }: FormRequirementsProps) {
  if (prerequisites.length === 0) return null;

  return (
    <ul className={cx("m-0 list-none divide-y divide-line p-0", className)}>
      {prerequisites.map((item) => (
        <li key={item._key} className="flex items-start gap-[var(--space-2)] py-[var(--space-2)]">
          <CheckIcon className="mt-[calc((1lh-16px)/2)] shrink-0 text-action" />
          <span>
            <span className="font-medium text-ink-900">{pick(item.label, locale)}</span>
            {item.detail ? <span className="block text-sm text-ink-600">{pick(item.detail, locale)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
