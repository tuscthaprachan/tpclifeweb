import { AuthCard } from "@/components/admin/shell/AuthShell";
import { missingAuthConfig } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Shown instead of a crash when sign-in has no database or secrets, which is
 * how a fresh clone, a preview without the Neon integration and `next build`
 * all look.
 */
export function NotConfigured({ locale }: { locale: Locale }) {
  return (
    <AuthCard icon="settings" title={a("notConfiguredTitle", locale)}>
      <p className="m-0">{a("notConfiguredBody", locale, { vars: missingAuthConfig().join(", ") })}</p>
    </AuthCard>
  );
}
