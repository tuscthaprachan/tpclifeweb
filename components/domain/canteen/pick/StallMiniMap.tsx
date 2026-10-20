import Link from "next/link";

import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenStall } from "@/lib/sanity/types";

import { mapHref } from "../links";
import { CanteenMap } from "../map/CanteenMap";
import { hasFloorPlan } from "../map/geometry";
import { EAT, t } from "../strings";

interface StallMiniMapProps {
  locale: Locale;
  data: CanteenData;
  /** The stalls to mark, in the order to visit them. One for a dish, several for a meal. */
  stalls: readonly CanteenStall[];
  filters: CanteenFilters;
  /** Needed only when two maps share a page. */
  idPrefix?: string;
  className?: string;
}

/**
 * A compact floor plan with the stall (or stalls) marked, and the link to the
 * full map with the same stalls highlighted. The plan is supplementary: the
 * stall name, number and wayfinding sentence beside it carry the same
 * information in words. Without a drawable floor plan only the link shows.
 */
export function StallMiniMap({ locale, data, stalls, filters, idPrefix = "mini", className }: StallMiniMapProps) {
  const slugs = stalls.map((stall) => stall.slug.current).join(",");
  return (
    <div className={cx("flex flex-col gap-[var(--space-2)]", className)}>
      {hasFloorPlan(data.settings, data.stalls) ? (
        <div className="max-w-[24rem]">
          <CanteenMap
            locale={locale}
            data={data}
            compact
            idPrefix={idPrefix}
            highlights={stalls.map((stall, position) => ({ stallId: stall._id, order: position + 1 }))}
          />
        </div>
      ) : null}
      <Link href={mapHref(locale, filters, slugs)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
        {t(EAT.showOnMap, locale)}
      </Link>
    </div>
  );
}
