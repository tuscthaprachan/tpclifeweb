import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea } from "@/components/admin/content/fields";
import { Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import { localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { textPlaceholders } from "@/lib/i18n/editable";
import { saveSiteText } from "./actions";
import { SITE_TEXT_MAX } from "./validate";

export interface SiteTextRow {
  /** Full key: `<namespace>.<key>`. */
  key: string;
  group: LocaleString;
  fallback: LocaleString;
  current: LocaleString;
  edited: boolean;
}

const short = (text: string) => (text.length > 80 ? `${text.slice(0, 80)}…` : text);

/** One page of strings, each prefilled with the wording the site shows now. Saving touches only these strings. */
export function SiteTextForm({
  locale,
  rows,
  recordId,
  record,
  saved,
  returnQuery,
}: {
  locale: Locale;
  rows: SiteTextRow[];
  recordId: string | null;
  record?: ContentRecordInfo;
  saved?: string;
  returnQuery: string;
}) {
  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveSiteText.bind(null, recordId)}
      record={record ? { ...record, viewHref: localePath(locale, "/") } : undefined}
      listHref="/admin/content"
      saved={saved}
      hasStatus={false}
    >
      <input type="hidden" name="$return" value={returnQuery} />
      <Stack space={6}>
        {rows.map((row, index) => {
          const marks = textPlaceholders(`${row.fallback.th} ${row.fallback.en}`);
          const hint = [
            `${pick(row.group, locale)} · ${row.key}`,
            row.edited ? a("sitHintBuiltIn", locale, { th: row.fallback.th, en: row.fallback.en }) : null,
            marks.length > 0 ? a("sitHintPlaceholders", locale, { list: marks.join(", ") }) : null,
          ]
            .filter(Boolean)
            .join(" · ");
          const longest = Math.max(row.fallback.th.length, row.fallback.en.length);
          return (
            <div key={row.key} className="border-0 border-b border-line pb-[var(--space-4)]">
              <input type="hidden" name={`k.${index}`} value={row.key} />
              <BilingualTextarea
                name={`v.${index}`}
                label={`${row.edited ? `${a("sitEditedMark", locale)} ` : ""}${short(row.fallback[locale])}`}
                hint={hint}
                rows={longest > 160 ? 4 : longest > 60 ? 2 : 1}
                maxLength={SITE_TEXT_MAX}
                defaultValue={row.current}
              />
            </div>
          );
        })}
      </Stack>
    </ContentForm>
  );
}
