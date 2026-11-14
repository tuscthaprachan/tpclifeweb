import { redirect } from "next/navigation";
import { ConfirmPanel } from "@/components/admin/ConfirmPanel";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireStaff } from "@/lib/auth/session";
import { getStaffMember } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { RecoveryForm } from "./RecoveryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("recoveryButton");
}

/** Confirm page before an admin makes a recovery link for a member of staff. */
export default async function RecoveryPage({ params }: { params: Promise<{ userId: string }> }) {
  const locale = await getAdminLocale();
  await requireStaff("admin");
  const { userId } = await params;

  const person = await getStaffMember(getDb(), userId);
  if (!person || person.suspended) redirect("/admin/staff?notice=gone");

  const name = person.name || person.email;
  return (
    <ConfirmPanel
      locale={locale}
      title={a("recoveryTitle", locale, { person: name })}
      icon="staff"
      description={a("recoveryIntro", locale, { person: name })}
      warning={a("recoveryWarning", locale)}
    >
      <RecoveryForm locale={locale} userId={person.userId} />
    </ConfirmPanel>
  );
}
