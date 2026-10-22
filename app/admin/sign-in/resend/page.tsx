import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, ErrorSummary, Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { getFlow } from "@/lib/admin/sign-in";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { UI } from "@/lib/i18n/strings";
import { resendCode } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("resendTitle");
}

export default async function ResendPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const flow = await getFlow();
  if (!flow) redirect("/admin/sign-in");
  const { error } = await searchParams;
  const limit = error?.match(/^limit-(\d{1,3})$/);
  const message = limit
    ? a("errTooManyCodes", locale, { minutes: Number(limit[1]) })
    : error
      ? a("errSendFailed", locale)
      : null;

  return (
    <AdminPage>
      {message ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#resend-button", message }]} /> : null}
      <div>
        <Heading level={1}>{a("resendTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("resendBody", locale, { email: flow.email })}</p>
      </div>
      <form action={resendCode}>
        <Button id="resend-button" type="submit">
          {a("resendButton", locale)}
        </Button>
      </form>
      <p>
        <a href="/admin/sign-in">{a("changeEmail", locale)}</a>
      </p>
    </AdminPage>
  );
}
