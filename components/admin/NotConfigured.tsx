import { AdminPage } from "@/components/admin/AdminPage";
import { Heading, NotificationBanner } from "@/components/ui";
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
    <AdminPage>
      <Heading level={1}>{a("notConfiguredTitle", locale)}</Heading>
      <NotificationBanner variant="warning" title={a("notConfiguredTitle", locale)}>
        {a("notConfiguredBody", locale, { vars: missingAuthConfig().join(", ") })}
      </NotificationBanner>
    </AdminPage>
  );
}
