import { redirect } from "next/navigation";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { SignInWithPasskey } from "@/components/admin/PasskeyButton";
import { AuthCard } from "@/components/admin/shell/AuthShell";
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
    <AuthCard icon="key" title={a("signInTitle", locale)}>
      <p className="m-0 text-ink-600">{a("signInIntro", locale)}</p>
      <SignInWithPasskey locale={locale} next={next} />
      <noscript>
        <InsetText>{a("signInNeedsScript", locale)}</InsetText>
      </noscript>
      <section className="border-t border-line pt-[var(--space-4)]">
        <Heading level={2} visualLevel={4} className="m-0 font-semibold">
          {a("signInLostHeading", locale)}
        </Heading>
        <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{a("signInLostBody", locale)}</p>
      </section>
    </AuthCard>
  );
}
