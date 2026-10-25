import { WarningText } from "@/components/ui";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { PublishWarning } from "@/lib/lost-found/intake";

const TEXT: Record<PublishWarning, AdminKey> = {
  storage: "lfcPublishWarnStorage",
  verification: "lfcPublishWarnVerification",
};

/** What is strongly recommended and still missing, shown before publishing. They warn; they never block. */
export function PublishWarnings({ warnings, locale }: { warnings: PublishWarning[]; locale: Locale }) {
  if (warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {warnings.map((w) => (
        <WarningText key={w}>
          <span className="visually-hidden">{a("tone_warning", locale)}: </span>
          {a(TEXT[w], locale)}
        </WarningText>
      ))}
    </div>
  );
}
