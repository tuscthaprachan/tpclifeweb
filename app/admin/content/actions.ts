"use server";

/**
 * Server Actions shared by every content form. Type-specific actions live
 * beside their pages (app/admin/content/news/actions.ts).
 */

import { getAdminLocale } from "@/lib/admin/locale";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { uploadContentImage, type UploadResult } from "@/lib/admin/content/images";

/** Uploads one picture from the image picker. Fields: file, altTh, altEn, isDecorative ("on"). */
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const file = formData.get("file");
  return uploadContentImage({
    file: file instanceof File ? file : null,
    altTh: String(formData.get("altTh") ?? ""),
    altEn: String(formData.get("altEn") ?? ""),
    isDecorative: formData.get("isDecorative") === "on",
    actor: await contentActor(staff),
    locale,
  });
}
