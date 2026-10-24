"use client";

import { TextField } from "@/components/admin/content/fields";
import { RowList } from "../organisations/_shared/RowList";

/** A list of single times or dates, one per line. Posts `<name>.0`, `<name>.1`... */
export function ValueListField({
  name,
  legend,
  hint,
  itemLabel,
  inputLabel,
  type,
  defaultValue,
  max,
}: {
  name: string;
  legend: string;
  hint?: string;
  itemLabel: string;
  inputLabel: string;
  type: "time" | "date";
  defaultValue: string[];
  max: number;
}) {
  return (
    <RowList<string>
      name={name}
      legend={legend}
      hint={hint}
      itemLabel={itemLabel}
      initial={defaultValue}
      max={max}
      compact
      orderable={false}
      blank={() => ""}
      renderRow={(value, { index }) => <TextField name={`${name}.${index}`} type={type} label={inputLabel} defaultValue={value} className="max-w-[14rem]" />}
    />
  );
}
