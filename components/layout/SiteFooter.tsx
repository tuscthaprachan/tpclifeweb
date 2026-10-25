/**
 * Footer: secondary navigation (including the accessibility statement and
 * cookies page), then the consistent help block. One `<footer>` landmark and
 * one `<nav>` landmark, both rendered once by the root layout so they appear
 * identically on every page.
 */

import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { HelpContact, NavItem } from "@/lib/content/types";
import { HelpBlock } from "./HelpBlock";
import { ServiceNavigation } from "./ServiceNavigation";
import { ShellContainer } from "./ShellContainer";
import { SiteLogo } from "./SiteLogo";

export function SiteFooter({
  locale,
  serviceName,
  footerNav,
  helpContacts,
}: {
  locale: Locale;
  serviceName: LocaleString;
  footerNav: NavItem[];
  helpContacts: HelpContact[];
}) {
  return (
    <footer className="mt-8 rounded-t-[var(--radius-band)] bg-surface-alt">
      <ShellContainer className="py-6">
        <ServiceNavigation
          locale={locale}
          items={footerNav}
          label={UI.footerMenu[locale]}
        />

        <HelpBlock locale={locale} contacts={helpContacts} />

        <p className="mt-4 flex items-center gap-2 text-sm text-ink-600">
          <SiteLogo size={28} />
          {pick(serviceName, locale)}
        </p>
      </ShellContainer>
    </footer>
  );
}
