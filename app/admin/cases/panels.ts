import type { ComponentType } from "react";
import type { CaseService } from "@/lib/cases/services";
import type { Locale } from "@/lib/i18n/config";
import { LostFoundPanel } from "./lost-found/LostFoundPanel";

/**
 * Extension point for service-specific parts of the case page. Register a
 * server component for a service and it is rendered on /admin/cases/<id>
 * between the contacts and the actions. It receives the case facts below and
 * does its own reading and writing (for example matching candidates for lost
 * and found, or the resolution form for complaints). Panels must check
 * nothing about access: the page has already refused staff without a role
 * for the service, and any engine call the panel makes checks again.
 *
 *   export const CASE_PANELS: CasePanelRegistry = { lost_found: LostFoundPanel };
 */
export interface CasePanelProps {
  caseId: string;
  reference: string;
  service: CaseService;
  kind: string;
  status: string;
  locale: Locale;
  /** The organisation actions are attributed to; pass it on if the panel posts back. */
  organisationId: number;
}

export type CasePanelRegistry = Partial<Record<CaseService, ComponentType<CasePanelProps>>>;

export const CASE_PANELS: CasePanelRegistry = { lost_found: LostFoundPanel };
