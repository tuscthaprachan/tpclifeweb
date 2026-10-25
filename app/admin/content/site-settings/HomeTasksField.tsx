"use client";

import { BilingualTextField, TextField } from "@/components/admin/content/fields";
import { useContentForm } from "@/components/admin/content/context";
import { MAX_HOME_TASKS } from "@/lib/content/home-tasks";
import type { HomeTaskJson } from "@/lib/db/schema/content/common";
import { a } from "@/lib/i18n/admin";
import { RowList } from "../organisations/_shared/RowList";

/** The Popular tasks list on the home page: a short label, one line of detail and the page it goes to, in display order. */
export function HomeTasksField({ defaultValue }: { defaultValue: HomeTaskJson[] }) {
  const { locale } = useContentForm();
  return (
    <RowList<HomeTaskJson>
      name="homeTasks"
      legend={a("siteFieldHomeTasks", locale)}
      hint={a("siteHintHomeTasks", locale, { max: MAX_HOME_TASKS })}
      itemLabel={a("siteHomeTaskItem", locale)}
      initial={defaultValue}
      max={MAX_HOME_TASKS}
      blank={() => ({ label: { th: "", en: "" }, description: { th: "", en: "" }, path: "" })}
      renderRow={(row, { index }) => {
        const path = `homeTasks.${index}`;
        return (
          <>
            <BilingualTextField name={`${path}.label`} label={a("siteFieldHomeTaskLabel", locale)} maxLength={45} defaultValue={row.label} />
            <BilingualTextField
              name={`${path}.description`}
              label={a("siteFieldHomeTaskDescription", locale)}
              hint={a("siteHintHomeTaskDescription", locale)}
              maxLength={120}
              defaultValue={row.description}
            />
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
