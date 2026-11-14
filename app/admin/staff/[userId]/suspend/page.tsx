import { notFound } from "next/navigation";
import { ConfirmPanel } from "@/components/admin/ConfirmPanel";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { Button } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireStaff } from "@/lib/auth/session";
import { getStaffMember } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { suspendMemberAction } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("smSuspendHeading");
}

export default async function SuspendMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const locale = await getAdminLocale();
  await requireStaff("admin");
  const { userId } = await params;
  const member = await getStaffMember(getDb(), userId);
  if (!member || member.suspended) notFound();

  const person = member.name || member.email;
  return (
    <ConfirmPanel locale={locale} title={a("smSuspendTitle", locale, { person })} icon="staff" warning={a("smSuspendBody", locale, { person })}>
      <form action={suspendMemberAction} className="flex flex-wrap items-center gap-[var(--space-3)]">
        <input type="hidden" name="userId" value={member.userId} />
        <Button type="submit" variant="destructive" icon={<PeopleIcon name="cancel" />}>
          {a("smSuspendButton", locale)}
        </Button>
        <Button href={`/admin/staff/${encodeURIComponent(member.userId)}`} variant="secondary">
          {a("keepIt", locale)}
        </Button>
      </form>
    </ConfirmPanel>
  );
}
