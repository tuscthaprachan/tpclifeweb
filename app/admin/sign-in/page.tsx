import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { SignInWithPasskey } from "@/components/admin/PasskeyButton";
import { Heading, InsetText } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { safeReturnPath } from "@/lib/admin/return-path";
import { isAuthConfigured } from "@/lib/auth";
import { getAdminSession } from "@/lib/auth/session";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("signInTitle");
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const next = safeReturnPath((await searchParams).next);
  const session = await getAdminSession();
  if (session?.secondFactorAt) redirect(next);

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("signInTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("signInIntro", locale)}</p>
      </div>
      <SignInWithPasskey locale={locale} next={next} />
      <noscript>
        <InsetText>{a("signInNeedsScript", locale)}</InsetText>
      </noscript>
      <section>
        <Heading level={2}>{a("signInLostHeading", locale)}</Heading>
        <p className="mt-[var(--space-2)]">{a("signInLostBody", locale)}</p>
      </section>
    </AdminPage>
  );
}
