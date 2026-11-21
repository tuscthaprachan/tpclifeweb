"use client";

import { BilingualTextField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { ProgrammeOfficeJson } from "@/lib/db/schema/content/faculties";
import { a } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

export function ProgrammeOfficesField({ defaultValue }: { defaultValue: ProgrammeOfficeJson[] }) {
  const { locale } = useContentForm();
  const name = "programmeOffices";
  return (
    <RowList<ProgrammeOfficeJson>
      name={name}
      legend={a("facGroupProgrammeOffices", locale)}
      hint={a("facHintProgrammeOffices", locale)}
      itemLabel={a("facFieldProgrammeOffice", locale)}
      initial={defaultValue}
      max={30}
      orderable
      blank={() => ({ name: { th: "", en: "" } })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <BilingualTextField
              name={`${path}.name`}
              label={a("facFieldProgrammeName", locale)}
              hint={a("facHintProgrammeName", locale)}
              maxLength={150}
              defaultValue={{ th: row.name.th, en: row.name.en }}
            />
            <div className="grid gap-[var(--space-3)] md:grid-cols-3">
              <TextField name={`${path}.email`} label={a("facFieldProgrammeEmail", locale)} maxLength={254} defaultValue={row.email ?? ""} />
              <TextField name={`${path}.phone`} label={a("facFieldProgrammePhone", locale)} maxLength={60} defaultValue={row.phone ?? ""} />
              <TextField name={`${path}.website`} label={a("facFieldProgrammeWebsite", locale)} inputMode="url" defaultValue={row.website ?? ""} />
            </div>
          </>
        );
      }}
    />
  );
}
