"use client";

import { BilingualTextField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { NavItemJson } from "@/lib/db/schema/content/common";
import { a } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

/** A menu or list of footer links: text in both languages and the page it goes to, in display order. */
export function NavField({
  name,
  legend,
  hint,
  itemLabel,
  defaultValue,
}: {
  name: "primaryNav" | "footerNav";
  legend: string;
  hint: string;
  itemLabel: string;
  defaultValue: NavItemJson[];
}) {
  const { locale } = useContentForm();
  return (
    <RowList<NavItemJson>
      name={name}
      legend={legend}
      hint={hint}
      itemLabel={itemLabel}
      initial={defaultValue}
      max={12}
      blank={() => ({ label: { th: "", en: "" }, path: "" })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <BilingualTextField name={`${path}.label`} label={a("siteFieldNavLabel", locale)} maxLength={80} defaultValue={row.label} />
            <TextField
              name={`${path}.path`}
              label={a("siteFieldNavPath", locale)}
              hint={a("siteHintNavPath", locale)}
              maxLength={200}
              defaultValue={row.path}
              className="max-w-[32rem]"
            />
          </>
        );
      }}
    />
  );
}
