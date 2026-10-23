import { StatusTag, type StatusTone } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import type { LostFoundStatus } from "@/lib/content/types";
import { statusLabel } from "./statusLabel";

interface LostFoundStatusTagProps {
  status: LostFoundStatus;
  locale: Locale;
  className?: string;
}

/**
 * `open` and `matched` are both still-active states, told apart from the
 * three end states by tone. `returned` is the one unambiguously good
 * outcome, so it is the only one that gets `success`. `unclaimed` and
 * `withdrawn` are both closed with no further action open to a reader, so
 * neither is dressed up as a warning or an error, they are `neutral` facts.
 */
const STATUS_TONE: Record<LostFoundStatus, StatusTone> = {
  open: "info",
  matched: "warning",
  returned: "success",
  unclaimed: "neutral",
  withdrawn: "neutral",
};

export function LostFoundStatusTag({ status, locale, className }: LostFoundStatusTagProps) {
  return <StatusTag tone={STATUS_TONE[status]} label={statusLabel(status, locale)} className={className} />;
}
