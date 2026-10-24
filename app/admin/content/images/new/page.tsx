import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Heading, NotificationBanner } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { UploadForm } from "../UploadForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("mediaUploadNew", locale) };
}

export default async function UploadImagePage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  return (
    <AdminPage width="content">
      <Heading level={1}>{a("mediaUploadNew", locale)}</Heading>
      {isStorageConfigured() ? (
        <>
          <p className="m-0 text-ink-600">{a("mediaUploadIntro", locale)}</p>
          <UploadForm locale={locale} />
        </>
      ) : (
        <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
          {a("errStorageNotConfigured", locale)}
        </NotificationBanner>
      )}
      <div>
        <Button href="/admin/content/images" variant="quiet">
          {a("formBackToList", locale)}
        </Button>
      </div>
    </AdminPage>
  );
}
