import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, DateTimeField, EnumRadios, TextField } from "@/components/admin/content/fields";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { Stack } from "@/components/ui";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { serviceAlerts } from "@/lib/db/schema";
import { ALERT_SURFACES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteAlert, saveAlert } from "./actions";

const SEVERITY_KEYS = { info: "alertsSeverityInfo", warning: "alertsSeverityWarning", critical: "alertsSeverityCritical" } as const;
const SURFACE_KEYS = {
  shuttle: "alertsSurfaceShuttle",
  campus: "alertsSurfaceCampus",
  forms: "alertsSurfaceForms",
  sitewide: "alertsSurfaceSitewide",
} as const;

/** The service alert form, for the "new" page (no `id`) and the edit page. */
export async function AlertForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("alerts")!;
  const [alert] = id ? await db.select().from(serviceAlerts).where(eq(serviceAlerts.id, id)) : [];
  if (id && !alert) notFound();
  const names = alert ? await userNames(db, [alert.updatedBy]) : new Map<string, string>();

  const record: ContentRecordInfo | undefined = alert
    ? {
        id: alert.id,
        status: alert.status,
        updatedAt: alert.updatedAt.toISOString(),
        updatedByName: alert.updatedBy ? names.get(alert.updatedBy) : null,
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const startsAt = alert ? formatBangkokDateTime(alert.startsAt) : formatBangkokDateTime(new Date());

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveAlert.bind(null, alert?.id ?? null)}
      deleteAction={alert ? deleteAlert.bind(null, alert.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <FormSection icon="alerts" legend={L("alertsGroupMessage")} id="g-message">
        <Stack space={4}>
          <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: alert?.titleTh, en: alert?.titleEn }} />
          <BilingualTextarea
            name="body"
            label={L("alertsFieldBody")}
            hint={L("alertsHintBody")}
            maxLength={1000}
            rows={4}
            defaultValue={{ th: alert?.bodyTh, en: alert?.bodyEn }}
          />
          <TextField
            name="moreInfoUrl"
            label={L("alertsFieldMoreInfo")}
            hint={L("alertsHintMoreInfo")}
            type="url"
            inputMode="url"
            defaultValue={alert?.moreInfoUrl}
            className="max-w-[32rem]"
          />
        </Stack>
      </FormSection>

      <FormSection icon="places" legend={L("alertsGroupWhere")} id="g-where">
        <Stack space={4}>
          <EnumRadios
            name="severity"
            label={L("alertsFieldSeverity")}
            defaultValue={alert?.severity ?? "info"}
            options={Object.entries(SEVERITY_KEYS).map(([value, key]) => ({ value, label: L(key) }))}
          />
          <ReferencePicker
            name="affects"
            label={L("alertsFieldAffects")}
            hint={L("alertsHintAffects")}
            multiple
            options={ALERT_SURFACES.map((value) => ({ value, label: { th: a(SURFACE_KEYS[value], "th"), en: a(SURFACE_KEYS[value], "en") } }))}
            defaultValue={alert?.affects ?? []}
          />
        </Stack>
      </FormSection>

      <FormSection icon="events" legend={L("alertsGroupWhen")} id="g-when">
        <Stack space={4}>
          <DateTimeField name="startsAt" label={L("alertsFieldStartsAt")} hint={L("alertsHintStartsAt")} defaultValue={startsAt} />
          <DateTimeField name="endsAt" label={L("alertsFieldEndsAt")} hint={L("alertsHintEndsAt")} defaultValue={formatBangkokDateTime(alert?.endsAt)} />
        </Stack>
      </FormSection>
    </ContentForm>
  );
}
