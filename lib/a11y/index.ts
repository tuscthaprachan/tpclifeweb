/**
 * Small accessibility helpers used across components.
 *
 * These exist so that the same accessibility decision is not made three
 * different ways in three different components.
 *
 * This file is a shared contract. Treat it as fixed.
 */

import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/**
 * Describes an external link so the reader knows where they are going and what
 * will happen, before they activate it (2.4.4 Link Purpose).
 *
 * Returns the suffix that belongs INSIDE the link text, visually hidden. Do not
 * put this in an aria-label: replacing the visible text with a label breaks
 * 2.5.3 Label in Name for anyone using voice control.
 */
export function externalLinkSuffix(locale: Locale, opensNewTab: boolean): string {
  return opensNewTab ? ` (${UI.opensInNewTab[locale]})` : "";
}

/** True when a URL points off this site. */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

/**
 * Attributes for a link that leaves the site. `noopener` is a security
 * requirement, not a preference: without it the destination gets a handle on
 * this window.
 */
export function externalLinkProps(opensNewTab = true) {
  return opensNewTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : ({} as const);
}

/**
 * Builds the id list that ties a form control to its hint and its error, for
 * aria-describedby. Order matters: the hint is read before the error, which is
 * how a reader hears what to do before hearing what went wrong.
 */
export function describedBy(
  id: string,
  options: { hasHint?: boolean; hasError?: boolean } = {},
): string | undefined {
  const ids: string[] = [];
  if (options.hasHint) ids.push(`${id}-hint`);
  if (options.hasError) ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/**
 * Heading level as a tag name, so a component can sit at whatever depth the
 * page needs without skipping a level (1.3.1, 2.4.6). Components that render a
 * heading must accept a level rather than hardcoding h2.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function headingTag(level: HeadingLevel): `h${HeadingLevel}` {
  return `h${level}` as const;
}

/**
 * How a status message should be announced (4.1.3 Status Messages).
 *
 * `polite` waits for a pause and is right for almost everything: search result
 * counts, filter results, save confirmations.
 *
 * `assertive` interrupts whatever is being read. Reserve it for something the
 * reader must act on now, such as a service alert that has just become
 * critical. Overusing it makes the site hostile to screen reader users.
 */
export type Announcement = "polite" | "assertive";

export function liveRegionProps(politeness: Announcement = "polite") {
  return {
    role: politeness === "assertive" ? ("alert" as const) : ("status" as const),
    "aria-live": politeness,
    "aria-atomic": true,
  };
}

/**
 * Props for a control that toggles something open and closed. The visible label
 * stays constant and aria-expanded carries the state, rather than the label
 * flipping between "Open" and "Close", which reads as a different control each
 * time.
 */
export function disclosureProps(isOpen: boolean, controlsId: string) {
  return {
    "aria-expanded": isOpen,
    "aria-controls": controlsId,
  };
}

/** Keys that activate a custom control. Use real buttons where you can. */
export const ACTIVATION_KEYS = ["Enter", " "] as const;

/**
 * Language attribute for a run of text in the other language, so a screen
 * reader switches voice rather than reading Thai with an English synthesiser
 * (3.1.2 Language of Parts).
 */
export function langProps(locale: Locale, contentLocale: Locale) {
  return contentLocale === locale ? {} : ({ lang: contentLocale } as const);
}
