import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { categoryOptions } from "@/lib/admin/content/options";
import { userNames } from "@/lib/admin/content/list";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { faqForms, faqs } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { Group } from "../_pages/Group";
import { deleteFaq, saveFaq } from "./actions";

/** The FAQ form, for the "new" page (no `id`) and the edit page. */
export async function FaqForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("faqs")!;
  const refs = await loadRichTextRefs(db);

  const [faq] = id ? await db.select().from(faqs).where(eq(faqs.id, id)) : [];
  if (id && !faq) notFound();
  const [links, names] = faq
    ? await Promise.all([
        db.select().from(faqForms).where(eq(faqForms.faqId, faq.id)).orderBy(asc(faqForms.position)),
        userNames(db, [faq.updatedBy]),
      ])
    : [[], new Map<string, string>()];

  const record: ContentRecordInfo | undefined = faq
    ? {
        id: faq.id,
        status: faq.status,
        updatedAt: faq.updatedAt.toISOString(),
        updatedByName: faq.updatedBy ? names.get(faq.updatedBy) : null,
        viewHref: localePath(locale, "/faq"),
      }
    : undefined;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveFaq.bind(null, faq?.id ?? null)}
      deleteAction={faq ? deleteFaq.bind(null, faq.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <Group id="group-text" legend={L("pagesGroupText")}>
        <BilingualTextField name="question" label={L("faqsFieldQuestion")} maxLength={300} defaultValue={{ th: faq?.questionTh, en: faq?.questionEn }} />
        <BilingualRichTextField name="answer" label={L("faqsFieldAnswer")} refs={refs} defaultValue={{ th: faq?.answerTh, en: faq?.answerEn }} />
      </Group>
      <Group id="group-placement" legend={L("pagesGroupPlacement")}>
        <EnumSelect
          name="category"
          label={L("fieldCategory")}
          hint={L("pagesHintCategory")}
          defaultValue={faq?.category ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...categoryOptions(locale)]}
        />
        <TextField name="sortOrder" type="number" inputMode="numeric" label={L("pagesFieldSortOrder")} hint={L("faqsHintSortOrder")} defaultValue={faq?.sortOrder?.toString()} className="max-w-[12rem]" />
        <ReferencePicker name="forms" label={L("faqsFieldForms")} hint={L("faqsHintForms")} multiple options={refs.forms} defaultValue={links.map((l) => l.formId)} />
        <TextField name="slug" label={L("faqsFieldSlug")} hint={L("faqsHintSlug")} defaultValue={faq?.slug} maxLength={80} className="max-w-[32rem]" />
      </Group>
    </ContentForm>
  );
}
