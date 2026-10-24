"use client";

import { BilingualTextField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { OpeningHoursJson } from "@/lib/db/schema/content/common";
import { a } from "@/lib/i18n/admin";
import { DaysField } from "../organisations/_shared/DaysField";
import { RowList } from "../organisations/_shared/RowList";

/** Opening periods of a place: which days, from when to when, with an optional note. */
export function HoursField({ defaultValue }: { defaultValue: OpeningHoursJson[] }) {
  const { locale } = useContentForm();
  const name = "openingHours";
  return (
    <RowList<OpeningHoursJson>
      name={name}
      legend={a("placesFieldHours", locale)}
      hint={a("placesHintHours", locale)}
      itemLabel={a("placesFieldHoursItem", locale)}
      initial={defaultValue}
      max={14}
      blank={() => ({ daysOfWeek: [1, 2, 3, 4, 5], opens: "08:30", closes: "16:30" })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <DaysField name={`${path}.days`} legend={a("placesFieldDays", locale)} defaultValue={row.daysOfWeek} />
            <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
              <TextField name={`${path}.opens`} type="time" label={a("placesFieldOpens", locale)} defaultValue={row.opens} className="max-w-[12rem]" />
              <TextField name={`${path}.closes`} type="time" label={a("placesFieldCloses", locale)} defaultValue={row.closes} className="max-w-[12rem]" />
            </div>
            <BilingualTextField
              name={`${path}.note`}
              label={a("placesFieldHoursNote", locale)}
              maxLength={200}
              defaultValue={{ th: row.note?.th, en: row.note?.en }}
            />
          </>
        );
      }}
    />
  );
}
