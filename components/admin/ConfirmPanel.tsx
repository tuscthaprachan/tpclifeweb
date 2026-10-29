import type { ReactNode } from "react";
import type { ConsoleIconName } from "@/components/admin/icons";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { WarningText } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

interface ConfirmPanelProps {
  locale: Locale;
  title: string;
  icon: ConsoleIconName;
  /** One line saying what is being confirmed. */
  description?: ReactNode;
  /** The consequence, in plain words. */
  warning: ReactNode;
  /** An error summary, shown above the header. */
  errors?: ReactNode;
  /** The form: hidden fields, the destructive button and the way back. */
  children: ReactNode;
}

/** The layout every "are you sure?" page shares: header, a card stating the consequence, then the buttons. */
export function ConfirmPanel({ locale, title, icon, description, warning, errors, children }: ConfirmPanelProps) {
  return (
    <ConsolePage width="narrow">
      {errors}
      <PageHeader title={title} icon={icon} description={description} />
      <Card>
        <div className="flex flex-col gap-[var(--space-5)]">
          <WarningText>
            <span className="visually-hidden">{UI.warning[locale]}: </span>
            {warning}
          </WarningText>
          {children}
        </div>
      </Card>
    </ConsolePage>
  );
}
