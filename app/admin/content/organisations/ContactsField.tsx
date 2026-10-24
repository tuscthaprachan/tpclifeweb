"use client";

import { BilingualTextField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { OrganisationContactJson } from "@/lib/db/schema/content/directory";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { RowList } from "./_shared/RowList";

const CHANNEL_KEY: Record<OrganisationContactJson["channel"], AdminKey> = {
  instagram: "dirChannelInstagram",
  facebook: "dirChannelFacebook",
  line: "dirChannelLine",
  email: "dirChannelEmail",
  phone: "dirChannelPhone",
  website: "dirChannelWebsite",
};

/** The contact channels of a directory entry: one titled box per channel, in display order. */
export function ContactsField({ defaultValue }: { defaultValue: OrganisationContactJson[] }) {
  const { locale } = useContentForm();
  const name = "contacts";
  return (
    <RowList<OrganisationContactJson>
      name={name}
      legend={a("dirFieldContacts", locale)}
      hint={a("dirHintContacts", locale)}
      itemLabel={a("dirFieldContact", locale)}
      initial={defaultValue}
      max={20}
      blank={() => ({ channel: "instagram", value: "" })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <div className="grid gap-[var(--space-3)] md:grid-cols-[14rem_1fr]">
              <EnumSelect
                name={`${path}.channel`}
                label={a("dirFieldChannel", locale)}
                defaultValue={row.channel}
                className="max-w-full"
                options={(Object.keys(CHANNEL_KEY) as (keyof typeof CHANNEL_KEY)[]).map((value) => ({ value, label: a(CHANNEL_KEY[value], locale) }))}
              />
              <TextField name={`${path}.value`} label={a("dirFieldContactValue", locale)} hint={a("dirHintContactValue", locale)} defaultValue={row.value} maxLength={300} />
            </div>
            <BilingualTextField
              name={`${path}.label`}
              label={a("dirFieldContactLabel", locale)}
              hint={a("dirHintContactLabel", locale)}
              maxLength={100}
              defaultValue={{ th: row.label?.th, en: row.label?.en }}
            />
          </>
        );
      }}
    />
  );
}
