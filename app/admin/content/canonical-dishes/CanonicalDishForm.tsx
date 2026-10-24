import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, SlugField } from "@/components/admin/content/fields";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { canonicalDishes, canteenDishes } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { RepeatRows, type RowValue } from "../canteen-stalls/RepeatRows";
import { deleteCanonicalDish, saveCanonicalDish } from "./actions";

/** The canonical dish form, for the "new" page (no `id`) and the edit page. */
export async function CanonicalDishForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("canonical-dishes")!;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const [dish] = id ? await db.select().from(canonicalDishes).where(eq(canonicalDishes.id, id)) : [];
  if (id && !dish) notFound();
  const [names, [{ n: used } = { n: 0 }]] = await Promise.all([
    userNames(db, [dish?.updatedBy]),
    dish ? db.select({ n: count() }).from(canteenDishes).where(eq(canteenDishes.canonicalId, dish.id)) : [{ n: 0 }],
  ]);

  const record: ContentRecordInfo | undefined = dish
    ? {
        id: dish.id,
        status: dish.status,
        updatedAt: dish.updatedAt.toISOString(),
        updatedByName: dish.updatedBy ? names.get(dish.updatedBy) : null,
        viewHref: localePath(locale, `/eat/what-is/${dish.slug}`),
      }
    : undefined;
  const aliasRows: RowValue[] = (dish?.aliases ?? []).map((value) => ({ value }));
  const phraseRows: RowValue[] = (dish?.howToOrder ?? []).map((p) => ({ th: p.th, romanised: p.romanised, en: p.en }));

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveCanonicalDish.bind(null, dish?.id ?? null)}
      deleteAction={dish ? deleteCanonicalDish.bind(null, dish.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      {dish && used > 0 ? <p className="m-0 text-sm text-ink-600">{a("canteenCanonicalUsed", locale, { count: used })}</p> : null}
      <BilingualTextField name="name" label={L("canteenFieldName")} maxLength={200} defaultValue={{ th: dish?.nameTh, en: dish?.nameEn }} />
      <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={dish?.slug} />
      <RepeatRows
        name="aliases"
        legend={L("canteenFieldAliases")}
        hint={L("canteenHintAliases")}
        itemLabel={L("canteenItemAlias")}
        max={30}
        defaultRows={aliasRows}
        fields={[{ key: "value", label: L("canteenFieldAlias"), kind: "text" }]}
      />
      <BilingualTextarea name="explainer" label={L("canteenFieldExplainer")} hint={L("canteenHintExplainer")} maxLength={1000} rows={5} defaultValue={{ th: dish?.explainerTh, en: dish?.explainerEn }} />
      <RepeatRows
        name="howToOrder"
        legend={L("canteenFieldHowToOrder")}
        hint={L("canteenHintHowToOrder")}
        itemLabel={L("canteenItemPhrase")}
        max={10}
        defaultRows={phraseRows}
        fields={[
          { key: "th", label: L("canteenFieldPhraseTh"), kind: "text", lang: "th" },
          { key: "romanised", label: L("canteenFieldSayRomanised"), kind: "text", lang: "en" },
          { key: "en", label: L("canteenFieldPhraseEn"), kind: "text", lang: "en" },
        ]}
      />
    </ContentForm>
  );
}
