import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { ImageDetails } from "./service";

/**
 * What the picture edit form must satisfy. A picture is described in both
 * languages unless it is marked decorative (WCAG 1.1.1), in which case the
 * description is stored empty. The caption or credit is both languages or neither.
 */
export function validateImageForm(input: { locale: Locale; formData: FormData }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const isDecorative = formData.get("isDecorative") === "on";

  const strict = fieldKit(locale, true);
  const loose = fieldKit(locale, false);
  const schema = z.object({
    alt: (isDecorative ? loose : strict).bilingual(L("mediaFieldAlt"), { required: !isDecorative, max: 300 }),
    caption: strict.bilingual(L("mediaFieldCaption"), { max: 300 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return { ok: false as const, errors: parsed.errors as FieldErrors };
  const { alt, caption } = parsed.data;
  const data: ImageDetails = {
    altTh: isDecorative ? "" : alt.th,
    altEn: isDecorative ? "" : alt.en,
    isDecorative,
    captionTh: caption.th || null,
    captionEn: caption.en || null,
  };
  return { ok: true as const, data };
}
