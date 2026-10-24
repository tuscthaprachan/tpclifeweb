"use client";

import { Checkboxes } from "@/components/ui";
import { useContentForm } from "@/components/admin/content/context";
import { fieldId } from "@/lib/admin/content/form-state";
import { a, type AdminKey } from "@/lib/i18n/admin";

/** Monday first, as staff read a week; the stored numbers are 0 (Sunday) to 6. */
const WEEK: readonly { day: number; key: AdminKey }[] = [
  { day: 1, key: "dirDayMon" },
  { day: 2, key: "dirDayTue" },
  { day: 3, key: "dirDayWed" },
  { day: 4, key: "dirDayThu" },
  { day: 5, key: "dirDayFri" },
  { day: 6, key: "dirDaySat" },
  { day: 0, key: "dirDaySun" },
];

/** Tick boxes for the days of the week. Posts the day numbers under `name`; read with `extraKit(locale).days()`. */
export function DaysField({ name, legend, hint, defaultValue = [] }: { name: string; legend: string; hint?: string; defaultValue?: number[] }) {
  const { errors, locale } = useContentForm();
  return (
    <Checkboxes
      id={fieldId(name)}
      name={name}
      legend={legend}
      hint={hint}
      error={errors[name]}
      options={WEEK.map(({ day, key }) => ({ value: String(day), label: a(key, locale) }))}
      defaultValue={defaultValue.map(String)}
    />
  );
}
