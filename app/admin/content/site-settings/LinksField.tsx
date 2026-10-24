"use client";

import { BilingualTextField, CheckboxField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import type { ExternalLinkJson } from "@/lib/db/schema/content/common";
import { a } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

/** Links out to the student organisations' own pages. */
export function LinksField({ defaultValue }: { defaultValue: ExternalLinkJson[] }) {
  const { locale } = useContentForm();
  const name = "organisationLinks";
  return (
    <RowList<ExternalLinkJson>
      name={name}
      legend={a("siteFieldLinks", locale)}
      hint={a("siteHintLinks", locale)}
      itemLabel={a("siteLinkItem", locale)}
      initial={defaultValue}
      max={20}
      blank={() => ({ label: { th: "", en: "" }, url: "" })}
      renderRow={(row, { index }) => {
        const path = `${name}.${index}`;
        return (
          <>
            <BilingualTextField name={`${path}.label`} label={a("siteFieldHelpLabel", locale)} maxLength={150} defaultValue={row.label} />
            <TextField name={`${path}.url`} type="url" inputMode="url" label={a("siteFieldLinkUrl", locale)} maxLength={2048} defaultValue={row.url} />
            <BilingualTextField
              name={`${path}.description`}
              label={a("siteFieldLinkDescription", locale)}
              maxLength={300}
              defaultValue={{ th: row.description?.th, en: row.description?.en }}
            />
            <CheckboxField name={`${path}.requiresSignIn`} label={a("siteFieldLinkSignIn", locale)} hint={a("siteHintLinkSignIn", locale)} defaultChecked={row.requiresSignIn ?? false} />
          </>
        );
      }}
    />
  );
}
