import { AdminPage } from "@/components/admin/AdminPage";
import { Button, Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("signedOutTitle");
}

/** Where idle timeouts and sign-outs land. Needs no session, so it works after the session is gone. */
export default async function SignedOutPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const locale = await getAdminLocale();
  const { reason } = await searchParams;
  const timedOut = reason === "timeout";

  return (
    <AdminPage>
      <Heading level={1}>{timedOut ? a("signedOutTitle", locale) : a("signedOutManual", locale)}</Heading>
      {timedOut ? <p className="m-0">{a("signedOutTimeout", locale)}</p> : null}
      <div>
        <Button href="/admin/sign-in">{a("signInAgain", locale)}</Button>
      </div>
    </AdminPage>
  );
}
