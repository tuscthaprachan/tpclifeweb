import NextLink from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { isAppHref } from "./app-href";

interface LinkProps {
  href: string;
  children: ReactNode;
  locale: Locale;
  className?: string;
  /** Overrides the auto-detected new-tab behaviour, for the rare external destination that should stay in this tab. */
  newTab?: boolean;
}

/**
 * Auto-detects an external URL and appends the visually-hidden "(opens in a
 * new tab)" suffix inside the link text (2.4.4), never as an aria-label,
 * which would replace the visible text instead of extending it (2.5.3).
 */
export function Link({ href, children, locale, className, newTab }: LinkProps) {
  const external = isExternalUrl(href);
  const opensNewTab = newTab ?? external;
  const suffix = externalLinkSuffix(locale, opensNewTab);

  if (!opensNewTab && isAppHref(href)) {
    return (
      <NextLink href={href} className={className}>
        {children}
      </NextLink>
    );
  }

  return (
    <a href={href} className={className} {...externalLinkProps(opensNewTab)}>
      {children}
      {suffix ? <span className="visually-hidden">{suffix}</span> : null}
    </a>
  );
}
