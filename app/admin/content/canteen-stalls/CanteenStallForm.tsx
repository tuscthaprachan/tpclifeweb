import { asc, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { ImagePicker } from "@/components/admin/content/ImagePicker";
import { CUISINE_LABEL } from "@/components/domain/canteen/labels";
import { Button, InsetText } from "@/components/ui";
import { isStorageConfigured, listImageChoices } from "@/lib/admin/content/images";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { canteenDishes, canteenStallAddOnDishes, canteenStallAddOns, canteenStalls } from "@/lib/db/schema";
import { CANTEEN_CUISINES, DISH_COURSES, MAP_SHAPES } from "@/lib/db/schema/content/enums";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { COURSE_KEY, WEEKDAY_ORDER, WEEKDAY_KEY } from "./labels";
import { CheckGroup } from "./CheckGroup";
import { RepeatRows, type RowValue } from "./RepeatRows";
import { deleteCanteenStall, saveCanteenStall } from "./actions";
import { labelled } from "./shared";

/** The stall form, for the "new" page (no `id`) and the edit page. */
export async function CanteenStallForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("canteen-stalls")!;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const [stall] = id ? await db.select().from(canteenStalls).where(eq(canteenStalls.id, id)) : [];
  if (id && !stall) notFound();
  const [images, names, dishes, addOns, links, [{ n: dishCount } = { n: 0 }]] = await Promise.all([
    listImageChoices(db),
    userNames(db, [stall?.updatedBy]),
    stall
      ? db.select({ id: canteenDishes.id, nameTh: canteenDishes.nameTh, nameEn: canteenDishes.nameEn, menuNumber: canteenDishes.menuNumber }).from(canteenDishes).where(eq(canteenDishes.stallId, stall.id)).orderBy(asc(canteenDishes.nameEn))
      : [],
    stall ? db.select().from(canteenStallAddOns).where(eq(canteenStallAddOns.stallId, stall.id)).orderBy(asc(canteenStallAddOns.position)) : [],
    stall
      ? db
          .select({ addOnId: canteenStallAddOnDishes.addOnId, dishId: canteenStallAddOnDishes.dishId })
          .from(canteenStallAddOnDishes)
          .innerJoin(canteenStallAddOns, eq(canteenStallAddOns.id, canteenStallAddOnDishes.addOnId))
          .where(eq(canteenStallAddOns.stallId, stall.id))
      : [],
    stall ? db.select({ n: count() }).from(canteenDishes).where(eq(canteenDishes.stallId, stall.id)) : [{ n: 0 }],
  ]);

  const record: ContentRecordInfo | undefined = stall
    ? {
        id: stall.id,
        status: stall.status,
        updatedAt: stall.updatedAt.toISOString(),
        updatedByName: stall.updatedBy ? names.get(stall.updatedBy) : null,
        viewHref: localePath(locale, `/eat/stalls/${stall.slug}`),
      }
    : undefined;

  const cuisineOptions = labelled(CANTEEN_CUISINES, CUISINE_LABEL, locale);
  const dayOptions = WEEKDAY_ORDER.map((value) => ({ value, label: L(WEEKDAY_KEY[value]) }));
  const courseOptions = DISH_COURSES.map((value) => ({ value, label: L(COURSE_KEY[value]) }));
  const dishOptions = dishes.map((d) => ({ value: d.id, label: `${d.menuNumber ? `${d.menuNumber}. ` : ""}${(locale === "th" ? d.nameTh || d.nameEn : d.nameEn || d.nameTh) || L("untitled")}` }));
  const linksByAddOn = new Map<string, string[]>();
  for (const link of links) linksByAddOn.set(link.addOnId, [...(linksByAddOn.get(link.addOnId) ?? []), link.dishId]);

  const hoursRows: RowValue[] = (stall?.hours ?? []).map((h) => ({
    daysOfWeek: h.daysOfWeek.map(String),
    opens: h.opens,
    closes: h.closes,
    "note.th": h.note?.th ?? "",
    "note.en": h.note?.en ?? "",
  }));
  const addOnRows: RowValue[] = addOns.map((o) => ({
    "label.th": o.labelTh,
    "label.en": o.labelEn,
    delta: String(o.delta),
    courses: o.courses,
    dishIds: linksByAddOn.get(o.id) ?? [],
  }));

  return (
    <>
      {stall ? (
        <div className="mb-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-3)]">
          <Button href={`${contentPath(getContentType("canteen-dishes")!)}?stall=${stall.id}`} variant="secondary">
            {a("canteenStallDishesLink", locale, { count: dishCount })}
          </Button>
          <Button href={`${contentPath(def, stall.id)}/prices`} variant="secondary">
            {L("canteenStallPricesLink")}
          </Button>
          <Button href={`${contentPath(getContentType("canteen-dishes")!)}/new?stall=${stall.id}`} variant="quiet">
            {L("canteenStallAddDish")}
          </Button>
        </div>
      ) : null}
      <ContentForm
        key={record?.updatedAt}
        locale={locale}
        action={saveCanteenStall.bind(null, stall?.id ?? null)}
        deleteAction={stall && dishCount === 0 ? deleteCanteenStall.bind(null, stall.id) : undefined}
        record={record}
        listHref={contentPath(def)}
        saved={saved}
      >
        {stall && dishCount > 0 ? <InsetText>{a("canteenStallHasDishes", locale, { count: dishCount })}</InsetText> : null}
        <BilingualTextField name="name" label={L("canteenFieldName")} maxLength={200} defaultValue={{ th: stall?.nameTh, en: stall?.nameEn }} />
        <SlugField label={L("fieldSlug")} suggestFrom="name.en" hint={L("canteenHintStallSlug")} defaultValue={stall?.slug} />
        <TextField name="number" label={L("canteenFieldNumber")} hint={L("canteenHintStallNumber")} inputMode="numeric" className="max-w-[10rem]" defaultValue={stall ? String(stall.number) : ""} />
        <CheckGroup name="cuisine" label={L("canteenFieldCuisine")} options={cuisineOptions} defaultValue={stall?.cuisine} />
        <CheckboxField name="halal" label={L("canteenFieldHalal")} hint={L("canteenHintHalal")} defaultChecked={stall?.halal} />
        <CheckboxField name="vegetarianStall" label={L("canteenFieldVegetarianStall")} hint={L("canteenHintVegetarianStall")} defaultChecked={stall?.vegetarianStall} />
        <RepeatRows
          name="hours"
          legend={L("canteenFieldHours")}
          hint={L("canteenHintHours")}
          itemLabel={L("canteenItemHours")}
          max={14}
          defaultRows={hoursRows}
          fields={[
            { key: "daysOfWeek", label: L("canteenFieldDays"), kind: "checks", options: dayOptions },
            { key: "opens", label: L("canteenFieldOpens"), kind: "time" },
            { key: "closes", label: L("canteenFieldCloses"), kind: "time" },
            { key: "note.th", label: `${L("canteenFieldHoursNote")} (${L("langThai")})`, kind: "text", lang: "th" },
            { key: "note.en", label: `${L("canteenFieldHoursNote")} (${L("langEnglish")})`, kind: "text", lang: "en" },
          ]}
        />
        <fieldset className="m-0 flex flex-col gap-[var(--space-3)] border-0 p-0">
          <legend className="mb-[var(--space-1)] text-lg font-semibold text-ink-900">{L("canteenFieldMapGroup")}</legend>
          <p className="m-0 text-sm text-ink-600">{L("canteenHintMap")}</p>
          <div className="grid gap-[var(--space-3)] sm:grid-cols-2 md:grid-cols-4">
            <TextField name="mapCol" label={L("canteenFieldMapCol")} inputMode="numeric" defaultValue={stall ? String(stall.mapCol) : ""} />
            <TextField name="mapRow" label={L("canteenFieldMapRow")} inputMode="numeric" defaultValue={stall ? String(stall.mapRow) : ""} />
            <TextField name="mapW" label={L("canteenFieldMapW")} inputMode="numeric" defaultValue={stall ? String(stall.mapW) : "1"} />
            <TextField name="mapH" label={L("canteenFieldMapH")} inputMode="numeric" defaultValue={stall ? String(stall.mapH) : "1"} />
          </div>
          <EnumSelect
            name="mapShape"
            label={L("canteenFieldMapShape")}
            defaultValue={stall?.mapShape ?? "rect"}
            options={MAP_SHAPES.map((value) => ({ value, label: L(value === "rect" ? "canteenShapeRect" : value === "triangleBottomRight" ? "canteenShapeTriBR" : "canteenShapeTriBL") }))}
          />
        </fieldset>
        <BilingualTextarea name="wayfinding" label={L("canteenFieldWayfinding")} hint={L("canteenHintWayfinding")} maxLength={500} rows={3} defaultValue={{ th: stall?.wayfindingTh, en: stall?.wayfindingEn }} />
        <ImagePicker
          name="photo"
          label={L("canteenFieldPhoto")}
          images={images}
          storageConfigured={isStorageConfigured()}
          defaultValue={stall?.photoId ? [stall.photoId] : []}
        />
        <RepeatRows
          name="addOns"
          legend={L("canteenFieldAddOns")}
          hint={stall ? L("canteenHintAddOns") : L("canteenHintAddOnsNew")}
          itemLabel={L("canteenItemAddOn")}
          max={30}
          defaultRows={addOnRows}
          fields={[
            { key: "label.th", label: `${L("canteenFieldAddOnLabel")} (${L("langThai")})`, kind: "text", lang: "th" },
            { key: "label.en", label: `${L("canteenFieldAddOnLabel")} (${L("langEnglish")})`, kind: "text", lang: "en" },
            { key: "delta", label: L("canteenFieldDelta"), kind: "number", hint: L("canteenHintDelta") },
            { key: "courses", label: L("canteenFieldCourses"), kind: "checks", options: courseOptions, hint: L("canteenHintAddOnCourses") },
            ...(stall && dishOptions.length > 0
              ? [{ key: "dishIds", label: L("canteenFieldAddOnDishes"), kind: "checks" as const, options: dishOptions, scroll: true, hint: L("canteenHintAddOnDishes") }]
              : []),
          ]}
        />
      </ContentForm>
    </>
  );
}
