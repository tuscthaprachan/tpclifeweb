import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getAdminSession } from "@/lib/auth/session";
import { a } from "@/lib/i18n/admin";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("signInTitle");
}

export default async function SignInPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const session = await getAdminSession();
  if (session?.secondFactorAt) redirect("/admin");

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("signInTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("signInIntro", locale)}</p>
      </div>
      <SignInForm locale={locale} />
    </AdminPage>
  );
}
