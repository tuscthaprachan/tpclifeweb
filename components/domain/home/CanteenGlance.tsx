import Link from "next/link";

import { DEMO_NOTICE, isCanteenDemo } from "@/lib/canteen/demo";
import { EAT, eat, t } from "@/components/domain/canteen/strings";
import { Heading } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";

interface CanteenGlanceProps {
  locale: Locale;
  /** Scheduled closing time "HH:mm", or null when the canteen is shut or its hours are unknown. */
  closesAt: string | null;
}

/**
 * One line in the at-a-glance block: "Canteen open until 15:00" (by the
 * published hours, never a live signal; left out when unknown) and a link to
 * "Decide for me". Same plain, text-first treatment as the rest of the block.
 */
export function CanteenGlance({ locale, closesAt }: CanteenGlanceProps) {
  return (
    <div>
      <Heading level={3} className="m-0 mb-[var(--space-2)] text-base">
        {t(EAT.title, locale)}
        {isCanteenDemo() ? <span className="ml-[var(--space-2)] font-normal">{t(DEMO_NOTICE.label, locale)}</span> : null}
      </Heading>
      <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-4)] text-ink-900">
        {closesAt ? <span>{eat.openUntil(locale, closesAt)}</span> : null}
        <Link href={localePath(locale, "/eat/pick")} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
          {t(EAT.decideButton, locale)}
        </Link>
      </p>
    </div>
  );
}
