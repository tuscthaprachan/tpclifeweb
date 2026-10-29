import Image from "next/image";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, CheckboxField } from "@/components/admin/content/fields";
import { InsetText, NotificationBanner } from "@/components/ui";
import { rowTitle } from "@/components/admin/content/ContentList";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { images } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteImageAction, saveImage } from "./actions";
import { findImageUses, type ImageUseRole } from "./usage";

const ROLE_KEY = { cover: "mediaRoleCover", gallery: "mediaRoleGallery", photo: "mediaRolePhoto", text: "mediaRoleText" } as const satisfies Record<ImageUseRole, string>;

/**
 * Edit page for one picture: preview, description, caption or credit, where it
 * is used, and Delete (offered only when nothing uses it).
 */
export async function ImageForm({ locale, id, notice, blocked }: { locale: Locale; id: string; notice?: "uploaded" | "saved"; blocked?: boolean }) {
  const db = getDb();
  const def = getContentType("images")!;
  const [image] = await db.select().from(images).where(eq(images.id, id));
  if (!image) notFound();
  const [uses, names] = await Promise.all([findImageUses(db, id), userNames(db, [image.createdBy])]);
  const url = publicImageUrl(image.storageKey);
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
          <a href={`${contentPath(def)}/new`}>{a("mediaUploadAnother", locale)}</a>
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
              <Image src={url} alt="" width={480} height={320} unoptimized className="h-auto max-h-80 w-auto max-w-full rounded-control bg-surface-sunk object-contain" />
            ) : (
              <InsetText>{a("errStorageNotConfigured", locale)}</InsetText>
            )}
          </figure>
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
              <p className="m-0 text-ink-600">{a("mediaUsedBlocked", locale)}</p>
              <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
                {uses.map((use, index) => {
                  const type = getContentType(use.segment);
                  const typeName = type ? a(type.labelKey, locale) : use.segment;
                  const title = rowTitle(use.title, locale);
                  return (
                    <li key={`${use.segment}-${use.id}-${use.role}-${index}`}>
                      {type?.available ? <a href={contentPath(type, use.id)}>{title}</a> : title}
                      <span className="text-ink-600">
                        {" "}
                        ({typeName}, {a(ROLE_KEY[use.role], locale)})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="m-0 text-ink-600">{a("mediaUsedNone", locale)}</p>
          )}
        </FormSection>
      </ContentForm>
    </div>
  );
}
