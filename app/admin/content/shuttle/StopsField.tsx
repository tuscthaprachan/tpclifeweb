"use client";

import { BilingualTextField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import { a } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

export interface StopDefault {
  nameTh: string;
  nameEn: string;
  offsetMinutes: number;
  noteTh: string | null;
  noteEn: string | null;
  lat: number | null;
  lng: number | null;
}

/** The stops of a route, in order. The first is the origin. */
export function StopsField({ defaultValue }: { defaultValue: StopDefault[] }) {
  const { locale } = useContentForm();
  const name = "stops";
  return (
    <RowList<StopDefault>
      name={name}
      legend={a("shuttleFieldStops", locale)}
      hint={a("shuttleHintStops", locale)}
      itemLabel={a("shuttleFieldStop", locale)}
      initial={defaultValue}
      max={60}
      blank={() => ({ nameTh: "", nameEn: "", offsetMinutes: 0, noteTh: null, noteEn: null, lat: null, lng: null })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <BilingualTextField name={`${path}.name`} label={a("dirFieldName", locale)} maxLength={150} defaultValue={{ th: row.nameTh, en: row.nameEn }} />
            <TextField
              name={`${path}.offsetMinutes`}
              label={a("shuttleFieldOffset", locale)}
              hint={a("shuttleHintOffset", locale)}
              inputMode="numeric"
              maxLength={3}
              defaultValue={String(row.offsetMinutes)}
              className="max-w-[16rem]"
            />
            <BilingualTextField name={`${path}.note`} label={a("shuttleFieldStopNote", locale)} maxLength={300} defaultValue={{ th: row.noteTh, en: row.noteEn }} />
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <TextField name={`${path}.lat`} label={a("dirFieldLat", locale)} maxLength={20} defaultValue={row.lat != null ? String(row.lat) : ""} />
              <TextField name={`${path}.lng`} label={a("dirFieldLng", locale)} maxLength={20} defaultValue={row.lng != null ? String(row.lng) : ""} />
            </div>
          </>
        );
      }}
    />
  );
}
