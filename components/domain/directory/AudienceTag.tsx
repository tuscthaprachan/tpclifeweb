import { Tag } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { DIRECTORY_TEXT } from "./strings";

export type Audience = "students" | "staff";

export function AudienceTag({ audience, locale }: { audience: Audience; locale: Locale }) {
  return audience === "students" ? (
    <Tag tone="activity">{DIRECTORY_TEXT.audienceStudents[locale]}</Tag>
  ) : (
    <Tag tone="governance">{DIRECTORY_TEXT.audienceStaff[locale]}</Tag>
  );
}
