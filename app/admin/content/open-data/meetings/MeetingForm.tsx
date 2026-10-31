import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { DateField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { userNames } from "@/lib/admin/content/list";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { getDb } from "@/lib/db";
import { OPEN_DATA_SESSION_TYPES, openDataDocuments, openDataMeetings, type OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { saveMeeting } from "../actions";
import { ownerLabel } from "../parts";

const num = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

export async function MeetingForm({ locale, owners, id, saved }: { locale: Locale; owners: readonly OpenDataOwner[]; id?: string; saved?: string }) {
  const db = getDb();
  const [meeting] = id ? await db.select().from(openDataMeetings).where(eq(openDataMeetings.id, id)) : [];
  if (id && (!meeting || !canEditOwner(owners, meeting.owner))) notFound();
  const names = meeting ? await userNames(db, [meeting.updatedBy]) : new Map<string, string>();
  const docs = await db
    .select({ id: openDataDocuments.id, owner: openDataDocuments.owner, number: openDataDocuments.number, titleTh: openDataDocuments.titleTh, titleEn: openDataDocuments.titleEn, type: openDataDocuments.type })
    .from(openDataDocuments)
    .where(inArray(openDataDocuments.owner, meeting ? [meeting.owner] : [...owners]))
    .orderBy(asc(openDataDocuments.owner), asc(openDataDocuments.number));
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const option = (d: (typeof docs)[number]) => ({
    value: d.id,
    label: `${owners.length > 1 && !meeting ? `${ownerLabel(d.owner, locale)} ` : ""}${d.number} ${(locale === "th" ? d.titleTh || d.titleEn : d.titleEn || d.titleTh).slice(0, 80)}`,
  });
  const record: ContentRecordInfo | undefined = meeting
    ? { id: meeting.id, status: "published", updatedAt: meeting.updatedAt.toISOString(), updatedByName: meeting.updatedBy ? names.get(meeting.updatedBy) : null }
    : undefined;

  return (
    <ContentForm key={record?.updatedAt} locale={locale} action={saveMeeting.bind(null, meeting?.id ?? null)} record={record} listHref={OPEN_DATA_PATHS.meetings} saved={saved} hasStatus={false}>
      <FormSection id="od-meeting-facts" icon="edit" legend={L("odmSecMeeting")} hint={L("odmHintMeeting")}>
        {meeting ? (
          <p className="m-0">
            <span className="font-medium">{L("fieldOwner")}:</span> {ownerLabel(meeting.owner, locale)}
          </p>
        ) : (
          <EnumSelect
            name="owner"
            label={L("fieldOwner")}
            defaultValue={owners.length === 1 ? owners[0] : ""}
            options={[...(owners.length === 1 ? [] : [{ value: "", label: L("choiceSelect") }]), ...owners.map((o) => ({ value: o, label: ownerLabel(o, locale) }))]}
          />
        )}
        <div className="grid gap-[var(--space-4)] md:grid-cols-3">
          <EnumSelect
            name="sessionType"
            label={L("odmFieldSessionType")}
            defaultValue={meeting?.sessionType ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...OPEN_DATA_SESSION_TYPES.map((t) => ({ value: t, label: L(t === "ordinary" ? "odmOptOrdinary" : "odmOptExtraordinary") }))]}
          />
          <TextField name="session" label={L("odmFieldSession")} defaultValue={num(meeting?.session)} inputMode="numeric" />
          <TextField name="meeting" label={L("odmFieldMeeting")} defaultValue={num(meeting?.meeting)} inputMode="numeric" />
        </div>
        <TextField name="titleTh" label={L("odmFieldMeetingTitle")} defaultValue={meeting?.titleTh} />
        <div className="grid gap-[var(--space-4)] md:grid-cols-3">
          <DateField name="meetingDate" label={L("odmFieldMeetingDate")} defaultValue={meeting?.meetingDate} />
          <TextField name="academicYear" label={L("odmFieldAcademicYear")} hint={L("odmHintAcademicYear")} defaultValue={num(meeting?.academicYear)} inputMode="numeric" />
          <DateField name="minutesAdoptedOn" label={L("odmFieldMinutesAdoptedOn")} defaultValue={meeting?.minutesAdoptedOn} />
        </div>
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <TextField name="place" label={L("odmFieldPlace")} defaultValue={meeting?.place} />
          <TextField name="chair" label={L("odmFieldChair")} defaultValue={meeting?.chair} />
        </div>
      </FormSection>
      <FormSection id="od-meeting-attendance" icon="info" legend={L("odmSecAttendance")} hint={L("odmHintAttendance")}>
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2 md:grid-cols-4">
          <TextField name="seats" label={L("odmFieldSeats")} defaultValue={num(meeting?.seats)} inputMode="numeric" />
          <TextField name="present" label={L("odmFieldPresent")} defaultValue={num(meeting?.present)} inputMode="numeric" />
          <TextField name="onLeave" label={L("odmFieldOnLeave")} defaultValue={num(meeting?.onLeave)} inputMode="numeric" />
          <TextField name="absent" label={L("odmFieldAbsent")} defaultValue={num(meeting?.absent)} inputMode="numeric" />
        </div>
      </FormSection>
      <FormSection id="od-meeting-docs" icon="guides" legend={L("odmSecMeetingDocs")}>
        <EnumSelect name="minutesDocument" label={L("odmFieldMinutesDocument")} defaultValue={meeting?.minutesDocumentId ?? ""} options={[{ value: "", label: L("choiceNone") }, ...docs.filter((d) => d.type === "minutes" || d.id === meeting?.minutesDocumentId).map(option)]} className="max-w-[40rem]" />
        <EnumSelect name="agendaDocument" label={L("odmFieldAgendaDocument")} defaultValue={meeting?.agendaDocumentId ?? ""} options={[{ value: "", label: L("choiceNone") }, ...docs.filter((d) => d.type === "agenda" || d.id === meeting?.agendaDocumentId).map(option)]} className="max-w-[40rem]" />
      </FormSection>
    </ContentForm>
  );
}
