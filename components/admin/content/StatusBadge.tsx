import { StatusTag } from "@/components/ui";
import type { StatusTone } from "@/components/ui/StatusTag";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * How each content status reads in a list. Add a status here (the scheduled
 * status, say) and every list, the hub and the bulk actions show it with its
 * own icon, word and colour; anything not listed falls back to neutral.
 */
export const STATUS_BADGES: Record<string, { tone: StatusTone; labelKey: AdminKey }> = {
  published: { tone: "success", labelKey: "statusPublished" },
  draft: { tone: "neutral", labelKey: "statusDraft" },
  scheduled: { tone: "info", labelKey: "statusScheduled" },
};

export function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.draft!;
  return <StatusTag tone={badge.tone} label={a(badge.labelKey, locale)} />;
}
