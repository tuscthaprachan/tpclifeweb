"use client";

import { BilingualTextField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { HelpContactJson } from "@/lib/db/schema/content/common";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

const CHANNEL_KEY: Record<HelpContactJson["channel"], AdminKey> = {
  line: "dirChannelLine",
  email: "dirChannelEmail",
  phone: "dirChannelPhone",
  inPerson: "siteChannelInPerson",
  url: "siteChannelUrl",
};

/** The "Need help" contacts shown at the foot of every page. */
export function HelpContactsField({ defaultValue }: { defaultValue: HelpContactJson[] }) {
  const { locale } = useContentForm();
  const name = "helpContacts";
  return (
    <RowList<HelpContactJson>
      name={name}
      legend={a("siteFieldHelp", locale)}
      hint={a("siteHintHelp", locale)}
      itemLabel={a("siteHelpItem", locale)}
      initial={defaultValue}
      max={10}
      blank={() => ({ label: { th: "", en: "" }, channel: "email", value: "" })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <BilingualTextField name={`${path}.label`} label={a("siteFieldHelpLabel", locale)} maxLength={120} defaultValue={row.label} />
            <div className="grid gap-[var(--space-3)] md:grid-cols-[14rem_1fr]">
              <EnumSelect
                name={`${path}.channel`}
                label={a("dirFieldChannel", locale)}
                defaultValue={row.channel}
                className="max-w-full"
                options={(Object.keys(CHANNEL_KEY) as (keyof typeof CHANNEL_KEY)[]).map((value) => ({ value, label: a(CHANNEL_KEY[value], locale) }))}
              />
              <TextField name={`${path}.value`} label={a("siteFieldHelpValue", locale)} hint={a("siteHintHelpValue", locale)} maxLength={500} defaultValue={row.value} />
            </div>
            <BilingualTextField name={`${path}.hours`} label={a("siteFieldHelpHours", locale)} maxLength={200} defaultValue={{ th: row.hours?.th, en: row.hours?.en }} />
          </>
        );
      }}
    />
  );
}
