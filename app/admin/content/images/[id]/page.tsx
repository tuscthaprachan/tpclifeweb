import { notFound } from "next/navigation";
import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { ImageForm } from "../ImageForm";

const REPLACE_ERRORS = ["errUploadChoose", "errUploadTooLarge", "errUploadType", "errStorageNotConfigured", "errUploadFailed", "errNotFound"] as const;

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeImagesOne", locale) };
}

export default async function EditImagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; uploaded?: string; blocked?: string; replaced?: string; rerr?: string }>;
}) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved, uploaded, blocked, replaced, rerr } = await searchParams;
  const replaceError = REPLACE_ERRORS.find((key) => key === rerr);

  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("images")} locale={locale} mode="edit" />
      <ImageForm locale={locale} id={id} notice={uploaded ? "uploaded" : replaced ? "replaced" : saved ? "saved" : undefined} blocked={Boolean(blocked)} replaceError={replaceError} />
    </ConsolePage>
  );
}
