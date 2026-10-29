import { MessageSquareWarning, PackageCheck, PackageSearch, Inbox, type LucideIcon } from "lucide-react";
import type { CaseService } from "@/lib/cases/services";

/** One icon per service and kind, so a row reads at a glance. */
export function serviceIcon(service: CaseService, kind: string): LucideIcon {
  if (service === "complaint") return MessageSquareWarning;
  if (service === "lost_found") return kind === "found" ? PackageCheck : PackageSearch;
  return Inbox;
}
