import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button, Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { listPasskeys } from "@/lib/auth/passkeys";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { removePasskeyAction } from "../../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("removePasskeyTitle");
}

export default async function RemovePasskeyPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  const staff = await requireStaff();
  const { id } = await params;
  const passkeys = await listPasskeys(getDb(), staff.user.id);
  const index = passkeys.findIndex((p) => p.id === id);
  if (index === -1) redirect("/admin/security?notice=gone");
  if (passkeys.length <= 1) redirect("/admin/security?notice=last-passkey");
  const key = passkeys[index]!;
  const label = key.name || `${a("passkeyUnnamed", locale)} ${index + 1}`;

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("removePasskeyTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)]">{a("removePasskeyBody", locale, { name: label })}</p>
      </div>
      <form action={removePasskeyAction} className="flex flex-wrap items-center gap-[var(--space-4)]">
        <input type="hidden" name="passkeyId" value={key.id} />
        <Button type="submit" variant="destructive">
          {a("removePasskeyButton", locale)}
        </Button>
        <a href="/admin/security">{a("keepIt", locale)}</a>
      </form>
    </AdminPage>
  );
}
