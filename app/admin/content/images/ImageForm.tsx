import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, CheckboxField } from "@/components/admin/content/fields";
import { InsetText, NotificationBanner } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { images } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteImageAction, saveImage } from "./actions";
import { findImageUses } from "./usage";
import { CopyUrlButton } from "./CopyUrlButton";
import { ReplaceForm } from "./ReplaceForm";
import { UsageList } from "./UsageList";
import { formatFileSize } from "@/lib/admin/media/format";
import { imageFileName } from "@/lib/admin/media/library";
import { getStorage } from "@/lib/storage";
import { KeyValue } from "@/components/admin/ui";
import { Timestamp } from "@/components/ui";

/**
 * Edit page for one picture: preview, description, caption or credit, where it
 * is used, and Delete (offered only when nothing uses it).
 */
export async function ImageForm({ locale, id, notice, blocked, replaceError }: { locale: Locale; id: string; notice?: "uploaded" | "saved" | "replaced"; blocked?: boolean; replaceError?: string }) {
  const db = getDb();
  const def = getContentType("images")!;
  const [image] = await db.select().from(images).where(eq(images.id, id));
  if (!image) notFound();
  const [uses, names] = await Promise.all([findImageUses(db, id), userNames(db, [image.createdBy])]);
  const url = publicImageUrl(image.storageKey);
  const fileSize = await storedSize(image.storageKey);
  const used = uses.length > 0;

  const record: ContentRecordInfo = {
    id: image.id,
    status: null,
    updatedAt: image.createdAt.toISOString(),
    updatedByName: image.createdBy ? names.get(image.createdBy) : null,
  };

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {notice === "uploaded" ? (
        <NotificationBanner variant="success" title={a("mediaUploaded", locale)}>
          {a("mediaUploadedNote", locale)}{" "}
          <Link href={`${contentPath(def)}/new`}>{a("mediaUploadAnother", locale)}</Link>
        </NotificationBanner>
      ) : null}
      {notice === "replaced" ? (
        <NotificationBanner variant="success" title={a("mlReplaced", locale)}>
          {a("mlReplacedNote", locale)}
        </NotificationBanner>
      ) : null}
      {replaceError ? (
        <NotificationBanner variant="warning" title={a("errUploadFailed", locale)}>
          {a(replaceError as AdminKey, locale)}
        </NotificationBanner>
      ) : null}
      {notice === "saved" ? (
        <NotificationBanner variant="success" title={a("formSavedUpdated", locale)}>
          {a("mediaSavedNote", locale)}
        </NotificationBanner>
      ) : null}
      {blocked ? (
        <NotificationBanner variant="warning" title={a("mediaUsedBlockedTitle", locale)}>
          {a("mediaUsedBlocked", locale)}
        </NotificationBanner>
      ) : null}

      <ContentForm
        key={[image.altTh, image.altEn, image.isDecorative, image.captionTh, image.captionEn].join("|")}
        locale={locale}
        action={saveImage.bind(null, image.id)}
        deleteAction={used ? undefined : deleteImageAction.bind(null, image.id)}
        record={record}
        listHref={contentPath(def)}
        hasStatus={false}
      >
        <FormSection id="media-preview" icon="images" legend={a("mediaPreview", locale)}>
          <figure className="m-0">
            {url ? (
              <Image src={url} alt="" width={image.width ?? 960} height={image.height ?? 640} unoptimized className="h-auto max-h-[32rem] w-auto max-w-full rounded-control bg-surface-sunk object-contain" />
            ) : (
              <InsetText>{a("errStorageNotConfigured", locale)}</InsetText>
            )}
          </figure>
          <KeyValue
            items={[
              { label: a("mlFileName", locale), value: <span className="break-all">{imageFileName(image.storageKey)}</span> },
              { label: a("mlFileType", locale), value: image.mimeType ?? a("mlUnknownSize", locale) },
              { label: a("mlFileDimensions", locale), value: image.width && image.height ? a("mlPixels", locale, { width: image.width, height: image.height }) : a("mlUnknownSize", locale) },
              { label: a("mlFileSize", locale), value: fileSize === null ? a("mlUnknownSize", locale) : formatFileSize(fileSize) },
              { label: a("mlFileUploadedBy", locale), value: (image.createdBy && names.get(image.createdBy)) || a("mlUnknownPerson", locale) },
              { label: a("mlFileUploadedAt", locale), value: <Timestamp value={image.createdAt} locale={locale} format="datetime" /> },
              ...(url
                ? [
                    {
                      label: a("mlFileUrl", locale),
                      value: (
                        <span className="flex flex-wrap items-center gap-[var(--space-2)]">
                          <span className="break-all">{url}</span>
                          <CopyUrlButton url={url} locale={locale} />
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </FormSection>
        <FormSection id="media-details" icon="edit" legend={a("cfSecImageDetails", locale)}>
          <BilingualTextField
            name="alt"
            label={a("mediaFieldAlt", locale)}
            hint={a("mediaFieldAltHint", locale)}
            maxLength={300}
            defaultValue={{ th: image.altTh, en: image.altEn }}
          />
          <CheckboxField name="isDecorative" label={a("imageDecorativeLabel", locale)} hint={a("mediaDecorativeHint", locale)} defaultChecked={image.isDecorative} />
          <BilingualTextField
            name="caption"
            label={a("mediaFieldCaption", locale)}
            hint={a("mediaFieldCaptionHint", locale)}
            maxLength={300}
            defaultValue={{ th: image.captionTh, en: image.captionEn }}
          />
        </FormSection>
        <FormSection id="media-used" icon="info" legend={a("mediaUsedTitle", locale)}>
          {used ? (
            <>
              <p className="m-0 text-ink-600">{a("mlDeleteBlockedList", locale, { count: uses.length })}</p>
              <UsageList uses={uses} locale={locale} />
            </>
          ) : (
            <p className="m-0 text-ink-600">{a("mediaUsedNone", locale)}</p>
          )}
        </FormSection>
      </ContentForm>

      <section aria-labelledby="media-replace-title" className="flex flex-col gap-[var(--space-3)]">
        <h2 id="media-replace-title" className="m-0 text-lg font-semibold">
          {a("mlReplaceTitle", locale)}
        </h2>
        <p className="m-0 text-ink-600">{a("mlReplaceIntro", locale)}</p>
        <ReplaceForm id={image.id} locale={locale} />
      </section>
    </div>
  );
}

/** The stored file's size in bytes, or null when storage is not configured or the file is gone. */
async function storedSize(storageKey: string): Promise<number | null> {
  try {
    const stored = await getStorage().get(storageKey);
    if (!stored) return null;
    await stored.body.cancel().catch(() => undefined);
    return stored.size;
  } catch {
    return null;
  }
}
