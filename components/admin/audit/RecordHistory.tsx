import { AuditEntries } from "@/components/admin/audit/AuditEntries";
import { Card } from "@/components/admin/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { recordHistory } from "@/lib/admin/audit/query";
import { isAuthConfigured } from "@/lib/auth";
import { hasRole } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

/**
 * The last 20 audit entries about one record. Entries about a complaint the
 * viewer may not see are left out; before and after values are shown to
 * administrators only.
 */
export async function RecordHistory({ entityType, entityId, limit = 20 }: { entityType: string; entityId: string; limit?: number }) {
  if (!isAuthConfigured()) return null;
  const staff = await getAdminSession();
  if (!staff) return null;
  const locale = await getAdminLocale();
  const entries = await recordHistory(getDb(), entityType, entityId, staff.user.id, limit);
  return (
    <Card title={a("opHistoryTitle", locale)} icon="audit" padded={false}>
      {entries.length === 0 ? (
        <p className="m-0 p-[var(--space-4)] text-sm text-ink-600">{a("opHistoryEmpty", locale)}</p>
      ) : (
        <AuditEntries entries={entries} locale={locale} showChanges={hasRole(staff.roles, "admin")} showEntity={false} />
      )}
    </Card>
  );
}
