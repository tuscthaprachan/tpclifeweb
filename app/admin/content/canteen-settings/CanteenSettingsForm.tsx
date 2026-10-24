import { asc } from "drizzle-orm";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { EnumSelect, TextField } from "@/components/admin/content/fields";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { loadChoices, userNames } from "@/lib/admin/content/list";
import { getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { canteenSettings } from "@/lib/db/schema";
import { FLOOR_SIDES } from "@/lib/db/schema/content/enums";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { LANDMARK_KEY, SIDE_KEY } from "../canteen-stalls/labels";
import { RepeatRows, type RowValue } from "../canteen-stalls/RepeatRows";
import { saveCanteenSettings } from "./actions";
import { LANDMARK_KINDS } from "./validate";

/** The floor plan form. There is one row: it is edited in place, and created on first save. */
export async function CanteenSettingsForm({ locale, saved }: { locale: Locale; saved?: string }) {
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const [settings] = await db.select().from(canteenSettings).orderBy(asc(canteenSettings.createdAt)).limit(1);
  const [placeChoices, names] = await Promise.all([loadChoices(db, getContentType("places")!), userNames(db, [settings?.updatedBy])]);

  const record: ContentRecordInfo | undefined = settings
    ? {
        id: settings.id,
        status: settings.status,
        updatedAt: settings.updatedAt.toISOString(),
        updatedByName: settings.updatedBy ? names.get(settings.updatedBy) : null,
        viewHref: localePath(locale, "/eat/map"),
      }
    : undefined;

  const sideOptions = FLOOR_SIDES.map((value) => ({ value, label: L(SIDE_KEY[value]) }));
  const kindOptions = LANDMARK_KINDS.map((value) => ({ value, label: L(LANDMARK_KEY[value]) }));
  const pair = (label: string) => [
    { key: "label.th", label: `${label} (${L("langThai")})`, kind: "text" as const, lang: "th" as const },
    { key: "label.en", label: `${label} (${L("langEnglish")})`, kind: "text" as const, lang: "en" as const },
  ];
  const num = (key: string, labelKey: Parameters<typeof a>[0]) => ({ key, label: L(labelKey), kind: "number" as const });
  const withSelect = (options: { value: string; label: string }[]) => [{ value: "", label: L("choiceSelect") }, ...options];

  const entranceRows: RowValue[] = (settings?.entrances ?? []).map((e) => ({ "label.th": e.label.th, "label.en": e.label.en, col: String(e.col), row: String(e.row), side: e.side }));
  const zoneRows: RowValue[] = (settings?.seatingZones ?? []).map((z) => ({ "label.th": z.label.th, "label.en": z.label.en, col: String(z.col), row: String(z.row), w: String(z.w), h: String(z.h) }));
  const outlineRows: RowValue[] = (settings?.outline ?? []).map((p) => ({ col: String(p.col), row: String(p.row) }));
  const landmarkRows: RowValue[] = (settings?.landmarks ?? []).map((l) => ({ kind: l.kind, "label.th": l.label.th, "label.en": l.label.en, col: String(l.col), row: String(l.row), w: String(l.w), h: String(l.h) }));

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveCanteenSettings.bind(null, settings?.id ?? null)}
      record={record}
      listHref="/admin/content"
      saved={saved}
      hasStatus={false}
    >
      <p className="m-0">{L("canteenSettingsIntro")}</p>
      <ReferencePicker name="canteenPlace" label={L("canteenFieldPlace")} hint={L("canteenHintPlace")} options={placeChoices} defaultValue={settings?.canteenPlaceId} />
      <div className="grid gap-[var(--space-4)] sm:grid-cols-2 md:grid-cols-3">
        <TextField name="gridCols" label={L("canteenFieldGridCols")} hint={L("canteenHintGrid")} inputMode="numeric" defaultValue={settings ? String(settings.gridCols) : ""} />
        <TextField name="gridRows" label={L("canteenFieldGridRows")} inputMode="numeric" defaultValue={settings ? String(settings.gridRows) : ""} />
        <EnumSelect
          name="riverSide"
          label={L("canteenFieldRiverSide")}
          hint={L("canteenHintRiverSide")}
          defaultValue={settings?.riverSide ?? ""}
          options={[{ value: "", label: L("choiceNone") }, ...sideOptions]}
        />
      </div>
      <RepeatRows
        name="entrances"
        legend={L("canteenFieldEntrances")}
        hint={L("canteenHintCells")}
        itemLabel={L("canteenItemEntrance")}
        defaultRows={entranceRows}
        fields={[
          ...pair(L("canteenFieldLabel")),
          num("col", "canteenFieldCol"),
          num("row", "canteenFieldRow"),
          { key: "side", label: L("canteenFieldSide"), kind: "select", options: withSelect(sideOptions) },
        ]}
      />
      <RepeatRows
        name="seatingZones"
        legend={L("canteenFieldSeating")}
        hint={L("canteenHintCells")}
        itemLabel={L("canteenItemSeating")}
        defaultRows={zoneRows}
        fields={[...pair(L("canteenFieldLabel")), num("col", "canteenFieldCol"), num("row", "canteenFieldRow"), num("w", "canteenFieldW"), num("h", "canteenFieldH")]}
      />
      <RepeatRows
        name="outline"
        legend={L("canteenFieldOutline")}
        hint={L("canteenHintOutline")}
        itemLabel={L("canteenItemPoint")}
        max={60}
        defaultRows={outlineRows}
        fields={[num("col", "canteenFieldCol"), num("row", "canteenFieldRow")]}
      />
      <RepeatRows
        name="landmarks"
        legend={L("canteenFieldLandmarks")}
        hint={L("canteenHintCells")}
        itemLabel={L("canteenItemLandmark")}
        max={40}
        defaultRows={landmarkRows}
        fields={[
          { key: "kind", label: L("canteenFieldLandmarkKind"), kind: "select", options: withSelect(kindOptions) },
          ...pair(L("canteenFieldLabel")),
          num("col", "canteenFieldCol"),
          num("row", "canteenFieldRow"),
          num("w", "canteenFieldW"),
          num("h", "canteenFieldH"),
        ]}
      />
    </ContentForm>
  );
}
