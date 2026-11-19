import Link from "next/link";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Heading } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { a, type AdminKey } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("shTeamTitle");
}

const SECTIONS: readonly { href: string; icon: ConsoleIconName; titleKey: AdminKey; descriptionKey: AdminKey }[] = [
  { href: "/admin/staff", icon: "staff", titleKey: "staffTitle", descriptionKey: "shTeamStaffDesc" },
  { href: "/admin/complaints/categories", icon: "complaintCategories", titleKey: "cpcatLink", descriptionKey: "shTeamCategoriesDesc" },
  { href: "/admin/audit", icon: "audit", titleKey: "opNavAudit", descriptionKey: "shTeamAuditDesc" },
  { href: "/admin/health", icon: "health", titleKey: "opNavHealth", descriptionKey: "shTeamHealthDesc" },
  { href: "/admin/settings/redirects", icon: "redirects", titleKey: "rdLink", descriptionKey: "shRedirectsDesc" },
];

export default async function TeamPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff("admin");

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("shTeamTitle", locale)} icon="staff" description={a("shTeamIntro", locale)} />
      <ul className="m-0 grid list-none gap-[var(--space-3)] p-0 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.href} className="console-card flex items-start gap-[var(--space-2)] p-[var(--space-3)]">
            <ConsoleIcon name={section.icon} size={22} className="mt-[2px] text-ink-600" />
            <div className="min-w-0 flex-1">
              <Heading level={2} visualLevel={5} className="m-0 font-semibold">
                <Link href={section.href}>{a(section.titleKey, locale)}</Link>
              </Heading>
              <p className="m-0 text-sm text-ink-600">{a(section.descriptionKey, locale)}</p>
            </div>
          </li>
        ))}
      </ul>
    </ConsolePage>
  );
}
