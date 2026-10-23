import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading, NotificationBanner } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { getFlow } from "@/lib/admin/sign-in";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { CodeForm } from "./CodeForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("codeTitle");
}

export default async function CodePage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const flow = await getFlow();
  if (!flow) redirect("/admin/sign-in");
  const { sent } = await searchParams;

  return (
    <AdminPage>
      {sent ? (
        <NotificationBanner variant="success" title={a("codeResentTitle", locale)}>
          {a("codeResentBody", locale, { email: flow.email })}
        </NotificationBanner>
      ) : null}
      <div>
        <Heading level={1}>{a("codeTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] font-medium">{a("codeSentTo", locale, { email: flow.email })}</p>
        <p className="mt-[var(--space-2)] text-ink-600">{a("codeIntro", locale)}</p>
      </div>
      <CodeForm locale={locale} />
      <p>
        <a href="/admin/sign-in/resend">{a("resendHelp", locale)}</a>
      </p>
    </AdminPage>
  );
}
