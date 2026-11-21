import { asc } from "drizzle-orm";
import { ClipboardList, FileText, HandHelping, Megaphone, PackageSearch, SearchCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { SectionJumpNav } from "@/components/admin/content/SectionJumpNav";
import { Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { SERVICE_PAGE_KEYS, SERVICE_PAGES, mergeServiceText, placeholders, type ServicePageKey, type ServiceTextField } from "@/lib/content/service-pages";
import { getDb } from "@/lib/db";
import { servicePages } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { saveServicePages } from "./actions";

const ICON: Record<ServicePageKey, LucideIcon> = {
  borrow: ClipboardList,
  complaints: Megaphone,
  lostReport: SearchCheck,
  foundReport: PackageSearch,
  report: HandHelping,
};

/** The Service pages form. One row: edited in place, created on first save, prefilled with the text each page shows now. */
export async function ServicePagesForm({ locale, saved }: { locale: Locale; saved?: string }) {
  const db = getDb();
  const L = (key: AdminKey, values?: Record<string, string>) => a(key, locale, values);
  const [settings] = await db.select().from(servicePages).orderBy(asc(servicePages.createdAt)).limit(1);
  const names = await userNames(db, [settings?.updatedBy]);
  const stored = settings?.texts ?? {};

  const record: ContentRecordInfo | undefined = settings
    ? {
        id: settings.id,
        status: settings.status,
        updatedAt: settings.updatedAt.toISOString(),
        updatedByName: settings.updatedBy ? names.get(settings.updatedBy) : null,
        viewHref: localePath(locale, "/services"),
      }
    : undefined;

  const hintFor = (def: ServiceTextField) => {
    const parts: string[] = [];
    if (def.list) parts.push(L("svpHintList"));
    const marks = placeholders(def.fallback.en);
    if (marks.length > 0) parts.push(L("svpHintPlaceholders", { list: marks.join(", ") }));
    return parts.length > 0 ? parts.join(". ") : undefined;
  };

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveServicePages.bind(null, settings?.id ?? null)}
      record={record}
      listHref="/admin/content"
      saved={saved}
      hasStatus={false}
    >
      <p className="m-0">{L("svpIntro")}</p>
      <SectionJumpNav label={L("fmSectionsNav")} items={SERVICE_PAGE_KEYS.map((page) => ({ id: `svp-${page}`, label: pick(SERVICE_PAGES[page].name, locale) }))} />

      {SERVICE_PAGE_KEYS.map((page, index) => {
        const def = SERVICE_PAGES[page];
        const fields: Record<string, ServiceTextField> = def.fields;
        const current: Record<string, { th: string; en: string }> = mergeServiceText(page, stored);
        return (
          <FormSection
            key={page}
            collapsible
            defaultOpen={index === 0}
            errorPrefixes={[`t.${page}.`]}
            id={`svp-${page}`}
            icon={ICON[page] ?? FileText}
            legend={pick(def.name, locale)}
            hint={
              <a href={localePath(locale, def.path)} target="_blank" rel="noreferrer" className="text-action underline">
                {L("svpViewPage")}
              </a>
            }
          >
            <Stack space={4}>
              {Object.entries(fields).map(([field, f]) => (
                <BilingualTextarea
                  key={field}
                  name={`t.${page}.${field}`}
                  label={pick(f.label, locale)}
                  hint={hintFor(f)}
                  rows={f.list ? 5 : f.max <= 120 ? 1 : 3}
                  maxLength={f.max}
                  defaultValue={current[field]}
                />
              ))}
            </Stack>
          </FormSection>
        );
      })}
    </ContentForm>
  );
}
