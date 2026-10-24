import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, CheckboxField, DateField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { ImagePicker } from "@/components/admin/content/ImagePicker";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { ALLERGEN_LABEL, PROTEIN_LABEL, STYLE_LABEL, TYPE_LABEL } from "@/components/domain/canteen/labels";
import { isStorageConfigured, listImageChoices } from "@/lib/admin/content/images";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { canonicalDishes, canteenDishes, canteenDishPriceHistory, canteenDishVariants, canteenStalls } from "@/lib/db/schema";
import { ALLERGENS, COOKING_STYLES, DISH_COURSES, DISH_TYPES, PROTEINS, TEMPERATURES } from "@/lib/db/schema/content/enums";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { CheckGroup } from "../canteen-stalls/CheckGroup";
import { COURSE_KEY, TEMPERATURE_KEY } from "../canteen-stalls/labels";
import { RepeatRows, type RowValue } from "../canteen-stalls/RepeatRows";
import { labelled, todayBangkok } from "../canteen-stalls/shared";
import { deleteCanteenDish, saveCanteenDish } from "./actions";

/** The dish form, for the "new" page (no `id`; `stallId` preselects the stall) and the edit page. */
export async function CanteenDishForm({ locale, id, saved, stallId }: { locale: Locale; id?: string; saved?: string; stallId?: string }) {
  const db = getDb();
  const def = getContentType("canteen-dishes")!;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const [dish] = id ? await db.select().from(canteenDishes).where(eq(canteenDishes.id, id)) : [];
  if (id && !dish) notFound();
  const [images, stalls, canonicals, variants, history, names] = await Promise.all([
    listImageChoices(db),
    db.select({ id: canteenStalls.id, number: canteenStalls.number, nameTh: canteenStalls.nameTh, nameEn: canteenStalls.nameEn }).from(canteenStalls).orderBy(asc(canteenStalls.number)),
    db.select({ id: canonicalDishes.id, nameTh: canonicalDishes.nameTh, nameEn: canonicalDishes.nameEn }).from(canonicalDishes).orderBy(asc(canonicalDishes.nameEn)),
    dish ? db.select().from(canteenDishVariants).where(eq(canteenDishVariants.dishId, dish.id)).orderBy(asc(canteenDishVariants.position)) : [],
    dish ? db.select().from(canteenDishPriceHistory).where(eq(canteenDishPriceHistory.dishId, dish.id)).orderBy(desc(canteenDishPriceHistory.checkedOn)) : [],
    userNames(db, [dish?.updatedBy]),
  ]);

  const record: ContentRecordInfo | undefined = dish
    ? {
        id: dish.id,
        status: dish.status,
        updatedAt: dish.updatedAt.toISOString(),
        updatedByName: dish.updatedBy ? names.get(dish.updatedBy) : null,
        viewHref: localePath(locale, `/eat/dishes/${dish.slug}`),
      }
    : undefined;

  const stallChoice = stalls.map((s) => ({ value: s.id, label: { th: `${s.number}. ${s.nameTh || s.nameEn}`, en: `${s.number}. ${s.nameEn || s.nameTh}` } }));
  const canonicalChoice = canonicals.map((c) => ({ value: c.id, label: { th: c.nameTh, en: c.nameEn } }));
  const sayRows: RowValue[] = (dish?.sayAs ?? []).map((p) => ({ th: p.th, romanised: p.romanised }));
  const variantRows: RowValue[] = variants.map((v) => ({ "label.th": v.labelTh, "label.en": v.labelEn, delta: String(v.delta) }));
  const preselected = stalls.some((s) => s.id === stallId) ? stallId : undefined;

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveCanteenDish.bind(null, dish?.id ?? null)}
      deleteAction={dish ? deleteCanteenDish.bind(null, dish.id) : undefined}
      record={record}
      listHref={dish ? `${contentPath(def)}?stall=${dish.stallId}` : contentPath(def)}
      saved={saved}
    >
      <BilingualTextField name="name" label={L("canteenFieldName")} maxLength={200} defaultValue={{ th: dish?.nameTh, en: dish?.nameEn }} />
      <SlugField label={L("fieldSlug")} suggestFrom="name.en" hint={L("canteenHintDishSlug")} defaultValue={dish?.slug} />
      <ReferencePicker name="stallId" label={L("canteenFieldStall")} options={stallChoice} defaultValue={dish?.stallId ?? preselected} emptyLabel={L("choiceSelect")} />
      <TextField name="menuNumber" label={L("canteenFieldMenuNumber")} hint={L("canteenHintMenuNumber")} maxLength={20} className="max-w-[10rem]" defaultValue={dish?.menuNumber} />
      <div className="grid gap-[var(--space-4)] md:grid-cols-3">
        <TextField name="price" label={L("canteenFieldPrice")} hint={L("canteenHintPrice")} inputMode="numeric" defaultValue={dish ? String(dish.price) : ""} />
        <DateField name="checkedOn" label={L("canteenFieldCheckedOn")} hint={L("canteenHintCheckedOn")} defaultValue={dish?.checkedOn ?? todayBangkok()} />
        <DateField name="lastReviewed" label={L("canteenFieldLastReviewed")} hint={L("canteenHintLastReviewed")} defaultValue={dish?.lastReviewed} />
      </div>
      {history.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-medium">{a("canteenPriceHistory", locale, { count: history.length })}</summary>
          <ul className="m-0 mt-[var(--space-2)] list-none p-0">
            {history.map((h) => (
              <li key={h.id}>{a("canteenPriceHistoryRow", locale, { date: h.checkedOn, price: h.price })}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <RepeatRows
        name="variants"
        legend={L("canteenFieldVariants")}
        hint={L("canteenHintVariants")}
        itemLabel={L("canteenItemVariant")}
        max={20}
        defaultRows={variantRows}
        fields={[
          { key: "label.th", label: `${L("canteenFieldVariantLabel")} (${L("langThai")})`, kind: "text", lang: "th" },
          { key: "label.en", label: `${L("canteenFieldVariantLabel")} (${L("langEnglish")})`, kind: "text", lang: "en" },
          { key: "delta", label: L("canteenFieldDelta"), kind: "number", hint: L("canteenHintDelta") },
        ]}
      />
      <EnumSelect name="type" label={L("canteenFieldType")} defaultValue={dish?.type ?? ""} options={[{ value: "", label: L("choiceSelect") }, ...labelled(DISH_TYPES, TYPE_LABEL, locale)]} />
      <EnumSelect
        name="course"
        label={L("canteenFieldCourse")}
        hint={L("canteenHintCourse")}
        defaultValue={dish?.course ?? ""}
        options={[{ value: "", label: L("choiceSelect") }, ...DISH_COURSES.map((value) => ({ value, label: L(COURSE_KEY[value]) }))]}
      />
      <CheckGroup name="protein" label={L("canteenFieldProtein")} hint={L("canteenHintProtein")} options={labelled(PROTEINS, PROTEIN_LABEL, locale)} defaultValue={dish?.protein} />
      <CheckGroup name="contains" label={L("canteenFieldContains")} hint={L("canteenHintContains")} options={labelled(ALLERGENS, ALLERGEN_LABEL, locale)} defaultValue={dish?.contains} />
      <EnumSelect
        name="style"
        label={L("canteenFieldStyle")}
        hint={L("canteenHintStyle")}
        defaultValue={dish?.style ?? ""}
        options={[{ value: "", label: L("choiceNone") }, ...labelled(COOKING_STYLES, STYLE_LABEL, locale)]}
      />
      <EnumSelect
        name="temperature"
        label={L("canteenFieldTemperature")}
        defaultValue={dish?.temperature ?? "hot"}
        options={TEMPERATURES.map((value) => ({ value, label: L(TEMPERATURE_KEY[value]) }))}
      />
      <CheckboxField name="wet" label={L("canteenFieldWet")} hint={L("canteenHintWet")} defaultChecked={dish?.wet} />
      <CheckboxField name="vegetarian" label={L("canteenFieldVegetarian")} hint={L("canteenHintVegetarian")} defaultChecked={dish?.vegetarian} />
      <RepeatRows
        name="sayAs"
        legend={L("canteenFieldSayAs")}
        hint={L("canteenHintSayAs")}
        itemLabel={L("canteenItemPhrase")}
        max={10}
        defaultRows={sayRows}
        fields={[
          { key: "th", label: L("canteenFieldSayTh"), kind: "text", lang: "th" },
          { key: "romanised", label: L("canteenFieldSayRomanised"), kind: "text", lang: "en" },
        ]}
      />
      <ReferencePicker name="canonicalId" label={L("canteenFieldCanonical")} hint={L("canteenHintCanonical")} options={canonicalChoice} defaultValue={dish?.canonicalId} />
      <ImagePicker
        name="photo"
        label={L("canteenFieldPhoto")}
        images={images}
        storageConfigured={isStorageConfigured()}
        defaultValue={dish?.photoId ? [dish.photoId] : []}
      />
    </ContentForm>
  );
}
